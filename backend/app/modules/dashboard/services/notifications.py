from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.dashboard.models import ExpirationNotification
from app.modules.dashboard.schemas import DocumentKind


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
