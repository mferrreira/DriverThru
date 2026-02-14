from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.deps.minio.minio_client import get_minio_client
from app.modules.customers.models import Customer


def utc_today() -> date:
    return datetime.now(UTC).date()


def count_generated_documents_today() -> int:
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


def count_expiring_for_model(db: Session, *, model: type, start: date, end: date) -> int:
    return (
        db.scalar(
            select(func.count(model.id))
            .join(Customer, Customer.id == model.customer_id)
            .where(
                Customer.active.is_(True),
                model.active.is_(True),
                model.is_current.is_(True),
                model.expiration_date.is_not(None),
                model.expiration_date.between(start, end),
            )
        )
        or 0
    )
