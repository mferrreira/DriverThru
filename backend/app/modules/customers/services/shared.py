from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.customers.models import Customer, NJDriverLicense


def get_customer_query(customer_id: int):
    return (
        select(Customer)
        .where(Customer.id == customer_id)
        .options(
            selectinload(Customer.addresses),
            selectinload(Customer.nj_driver_licenses).selectinload(NJDriverLicense.endorsements),
            selectinload(Customer.nj_driver_licenses).selectinload(NJDriverLicense.restrictions),
            selectinload(Customer.brazil_driver_licenses),
            selectinload(Customer.passports),
        )
    )


def clear_current_flags(
    db: Session,
    *,
    model: type,
    customer_id: int,
    except_id: int | None = None,
) -> None:
    stmt = select(model).where(
        model.customer_id == customer_id,
        model.active.is_(True),
        model.is_current.is_(True),
    )
    current_items = db.scalars(stmt).all()
    for item in current_items:
        if except_id is not None and item.id == except_id:
            continue
        item.is_current = False
