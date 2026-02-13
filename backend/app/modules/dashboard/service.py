from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select, tuple_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.deps.minio.minio_client import get_minio_client
from app.modules.customers.models import BrazilDriverLicense, Customer, NJDriverLicense, Passport
from app.modules.dashboard.models import ExpirationNotification
from app.modules.dashboard.schemas import (
    DashboardPendingItem,
    DashboardPendingListResponse,
    DashboardSummaryResponse,
    DocumentKind,
)


def get_dashboard_summary(db: Session) -> DashboardSummaryResponse:
    today = datetime.now(UTC).date()
    plus_30 = today + timedelta(days=30)

    customers_total = db.scalar(select(func.count(Customer.id)).where(Customer.active.is_(True))) or 0
    expiring_today = _count_expiring_documents(db=db, start=today, end=today)
    expiring_in_30_days = _count_expiring_documents(db=db, start=today + timedelta(days=1), end=plus_30)
    documents_generated_today = _count_generated_documents_today()

    return DashboardSummaryResponse(
        customers_total=customers_total,
        documents_generated_today=documents_generated_today,
        expiring_in_30_days=expiring_in_30_days,
        expiring_today=expiring_today,
    )


def list_prioritized_pending(
    db: Session,
    days_ahead: int = 30,
    include_notified: bool = True,
) -> DashboardPendingListResponse:
    today = datetime.now(UTC).date()
    horizon = today + timedelta(days=max(days_ahead, 0))

    items = (
        _list_expiring_nj(db=db, today=today, horizon=horizon)
        + _list_expiring_br(db=db, today=today, horizon=horizon)
        + _list_expiring_passports(db=db, today=today, horizon=horizon)
    )
    if not items:
        return DashboardPendingListResponse(items=[], total=0, pending_count=0, notified_count=0)

    keys = [(item.document_type, item.source_document_id) for item in items]
    tracker_stmt = select(ExpirationNotification).where(
        tuple_(ExpirationNotification.document_type, ExpirationNotification.source_document_id).in_(keys)
    )
    trackers = db.scalars(tracker_stmt).all()
    tracker_map = {(tracker.document_type, tracker.source_document_id): tracker for tracker in trackers}

    enriched: list[DashboardPendingItem] = []
    for item in items:
        tracker = tracker_map.get((item.document_type, item.source_document_id))
        notified = tracker is not None and tracker.notified_at is not None
        if not include_notified and notified:
            continue
        enriched.append(
            DashboardPendingItem(
                customer_id=item.customer_id,
                customer_name=item.customer_name,
                document_type=item.document_type,
                source_document_id=item.source_document_id,
                expiration_date=item.expiration_date,
                days_until_expiration=item.days_until_expiration,
                notified=notified,
                notified_at=tracker.notified_at if tracker else None,
            )
        )

    pending_count = sum(1 for item in enriched if not item.notified)
    notified_count = sum(1 for item in enriched if item.notified)
    enriched.sort(key=lambda item: (item.notified, item.days_until_expiration, item.expiration_date))
    return DashboardPendingListResponse(
        items=enriched,
        total=len(enriched),
        pending_count=pending_count,
        notified_count=notified_count,
    )


def set_notification_status(
    db: Session,
    customer_id: int,
    document_type: DocumentKind,
    source_document_id: int,
    expiration_date: date,
    notified: bool,
) -> None:
    stmt = select(ExpirationNotification).where(
        ExpirationNotification.document_type == document_type,
        ExpirationNotification.source_document_id == source_document_id,
    )
    record = db.scalar(stmt)
    if record is None:
        record = ExpirationNotification(
            customer_id=customer_id,
            document_type=document_type,
            source_document_id=source_document_id,
            expiration_date=expiration_date,
        )
        db.add(record)

    record.customer_id = customer_id
    record.expiration_date = expiration_date
    record.notified_at = datetime.now(UTC) if notified else None
    db.commit()


def _count_expiring_documents(db: Session, start: date, end: date) -> int:
    return _count_expiring_nj(db=db, start=start, end=end) + _count_expiring_br(db=db, start=start, end=end) + _count_expiring_passports(db=db, start=start, end=end)


def _count_expiring_nj(db: Session, start: date, end: date) -> int:
    return db.scalar(
        select(func.count(NJDriverLicense.id))
        .join(Customer, Customer.id == NJDriverLicense.customer_id)
        .where(
            Customer.active.is_(True),
            NJDriverLicense.active.is_(True),
            NJDriverLicense.is_current.is_(True),
            NJDriverLicense.expiration_date.is_not(None),
            NJDriverLicense.expiration_date.between(start, end),
        )
    ) or 0


def _count_expiring_br(db: Session, start: date, end: date) -> int:
    return db.scalar(
        select(func.count(BrazilDriverLicense.id))
        .join(Customer, Customer.id == BrazilDriverLicense.customer_id)
        .where(
            Customer.active.is_(True),
            BrazilDriverLicense.active.is_(True),
            BrazilDriverLicense.is_current.is_(True),
            BrazilDriverLicense.expiration_date.is_not(None),
            BrazilDriverLicense.expiration_date.between(start, end),
        )
    ) or 0


def _count_expiring_passports(db: Session, start: date, end: date) -> int:
    return db.scalar(
        select(func.count(Passport.id))
        .join(Customer, Customer.id == Passport.customer_id)
        .where(
            Customer.active.is_(True),
            Passport.active.is_(True),
            Passport.is_current.is_(True),
            Passport.expiration_date.is_not(None),
            Passport.expiration_date.between(start, end),
        )
    ) or 0


def _count_generated_documents_today() -> int:
    date_token = datetime.now(UTC).strftime("%Y%m%d_")
    prefix = settings.GENERATED_DOCUMENTS_PREFIX
    client = get_minio_client()
    count = 0
    try:
        for item in client.list_objects(settings.MINIO_BUCKET, prefix=prefix, recursive=True):
            object_name = getattr(item, "object_name", "")
            if f"_{date_token}" in object_name:
                count += 1
    except Exception:
        return 0
    return count


def _list_expiring_nj(db: Session, today: date, horizon: date) -> list[DashboardPendingItem]:
    stmt = (
        select(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            NJDriverLicense.id,
            NJDriverLicense.expiration_date,
        )
        .join(Customer, Customer.id == NJDriverLicense.customer_id)
        .where(
            Customer.active.is_(True),
            NJDriverLicense.active.is_(True),
            NJDriverLicense.is_current.is_(True),
            NJDriverLicense.expiration_date.is_not(None),
            NJDriverLicense.expiration_date <= horizon,
        )
    )
    rows = db.execute(stmt).all()
    return [
        DashboardPendingItem(
            customer_id=row[0],
            customer_name=f"{row[1]} {row[2]}".strip(),
            document_type="nj_driver_license",
            source_document_id=row[3],
            expiration_date=row[4],
            days_until_expiration=(row[4] - today).days,
            notified=False,
            notified_at=None,
        )
        for row in rows
    ]


def _list_expiring_br(db: Session, today: date, horizon: date) -> list[DashboardPendingItem]:
    stmt = (
        select(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            BrazilDriverLicense.id,
            BrazilDriverLicense.expiration_date,
        )
        .join(Customer, Customer.id == BrazilDriverLicense.customer_id)
        .where(
            Customer.active.is_(True),
            BrazilDriverLicense.active.is_(True),
            BrazilDriverLicense.is_current.is_(True),
            BrazilDriverLicense.expiration_date.is_not(None),
            BrazilDriverLicense.expiration_date <= horizon,
        )
    )
    rows = db.execute(stmt).all()
    return [
        DashboardPendingItem(
            customer_id=row[0],
            customer_name=f"{row[1]} {row[2]}".strip(),
            document_type="brazil_driver_license",
            source_document_id=row[3],
            expiration_date=row[4],
            days_until_expiration=(row[4] - today).days,
            notified=False,
            notified_at=None,
        )
        for row in rows
    ]


def _list_expiring_passports(db: Session, today: date, horizon: date) -> list[DashboardPendingItem]:
    stmt = (
        select(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            Passport.id,
            Passport.expiration_date,
        )
        .join(Customer, Customer.id == Passport.customer_id)
        .where(
            Customer.active.is_(True),
            Passport.active.is_(True),
            Passport.is_current.is_(True),
            Passport.expiration_date.is_not(None),
            Passport.expiration_date <= horizon,
        )
    )
    rows = db.execute(stmt).all()
    return [
        DashboardPendingItem(
            customer_id=row[0],
            customer_name=f"{row[1]} {row[2]}".strip(),
            document_type="passport",
            source_document_id=row[3],
            expiration_date=row[4],
            days_until_expiration=(row[4] - today).days,
            notified=False,
            notified_at=None,
        )
        for row in rows
    ]
