from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select, tuple_
from sqlalchemy.orm import Session

from app.modules.customers.models import BrazilDriverLicense, Customer, NJDriverLicense, Passport
from app.modules.dashboard.models import ExpirationNotification
from app.modules.dashboard.schemas import DashboardPendingItem, DashboardPendingListResponse, DocumentKind

from .common import utc_today


def list_prioritized_pending(
    db: Session,
    days_ahead: int = 30,
    include_notified: bool = True,
) -> DashboardPendingListResponse:
    today = utc_today()
    horizon = today + timedelta(days=max(days_ahead, 0))

    items = (
        _list_expiring_for_model(
            db=db,
            model=NJDriverLicense,
            document_type="nj_driver_license",
            today=today,
            horizon=horizon,
        )
        + _list_expiring_for_model(
            db=db,
            model=BrazilDriverLicense,
            document_type="brazil_driver_license",
            today=today,
            horizon=horizon,
        )
        + _list_expiring_for_model(
            db=db,
            model=Passport,
            document_type="passport",
            today=today,
            horizon=horizon,
        )
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


def _list_expiring_for_model(
    db: Session,
    *,
    model: type,
    document_type: DocumentKind,
    today: date,
    horizon: date,
) -> list[DashboardPendingItem]:
    stmt = (
        select(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            model.id,
            model.expiration_date,
        )
        .join(Customer, Customer.id == model.customer_id)
        .where(
            Customer.active.is_(True),
            model.active.is_(True),
            model.is_current.is_(True),
            model.expiration_date.is_not(None),
            model.expiration_date <= horizon,
        )
    )
    rows = db.execute(stmt).all()
    return [
        DashboardPendingItem(
            customer_id=row[0],
            customer_name=f"{row[1]} {row[2]}".strip(),
            document_type=document_type,
            source_document_id=row[3],
            expiration_date=row[4],
            days_until_expiration=(row[4] - today).days,
            notified=False,
            notified_at=None,
        )
        for row in rows
    ]
