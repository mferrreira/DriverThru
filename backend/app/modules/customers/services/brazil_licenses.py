from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.modules.customers.errors import LicenseNotFoundError
from app.modules.customers.models import BrazilDriverLicense
from app.modules.customers.schemas import BrazilDriverLicenseCreate, BrazilDriverLicenseUpdate

from .customers import get_customer_or_404
from .shared import clear_current_flags


def list_brazil_licenses(
    db: Session,
    customer_id: int,
    include_inactive: bool = False,
    search: str | None = None,
) -> list[BrazilDriverLicense]:
    get_customer_or_404(db, customer_id)
    stmt = (
        select(BrazilDriverLicense)
        .where(BrazilDriverLicense.customer_id == customer_id)
        .order_by(BrazilDriverLicense.created_at.desc())
    )
    if not include_inactive:
        stmt = stmt.where(BrazilDriverLicense.active.is_(True))
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                BrazilDriverLicense.registry_number.ilike(term),
                BrazilDriverLicense.identity_number.ilike(term),
                BrazilDriverLicense.full_name.ilike(term),
            )
        )
    return list(db.scalars(stmt).all())


def create_brazil_license(db: Session, customer_id: int, payload: BrazilDriverLicenseCreate) -> BrazilDriverLicense:
    get_customer_or_404(db, customer_id)
    if payload.is_current:
        clear_current_flags(db, model=BrazilDriverLicense, customer_id=customer_id)
    license_obj = BrazilDriverLicense(customer_id=customer_id, **payload.model_dump())
    db.add(license_obj)
    db.commit()
    db.refresh(license_obj)
    return license_obj


def update_brazil_license(
    db: Session,
    customer_id: int,
    license_id: int,
    payload: BrazilDriverLicenseUpdate,
) -> BrazilDriverLicense:
    license_obj = get_brazil_license_or_404(db, customer_id, license_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(license_obj, field, value)
    if payload.is_current:
        clear_current_flags(db, model=BrazilDriverLicense, customer_id=customer_id, except_id=license_id)
    db.commit()
    db.refresh(license_obj)
    return license_obj


def renew_brazil_license(
    db: Session,
    customer_id: int,
    license_id: int,
    payload: BrazilDriverLicenseCreate,
) -> BrazilDriverLicense:
    current = get_brazil_license_or_404(db, customer_id, license_id)
    current.is_current = False
    data = payload.model_dump()
    data["is_current"] = True
    new_license = BrazilDriverLicense(customer_id=customer_id, **data)
    db.add(new_license)
    db.commit()
    db.refresh(new_license)
    return new_license


def deactivate_brazil_license(db: Session, customer_id: int, license_id: int) -> None:
    license_obj = get_brazil_license_or_404(db, customer_id, license_id)
    license_obj.active = False
    license_obj.is_current = False
    db.commit()


def get_brazil_license_or_404(db: Session, customer_id: int, license_id: int) -> BrazilDriverLicense:
    stmt = select(BrazilDriverLicense).where(
        BrazilDriverLicense.id == license_id,
        BrazilDriverLicense.customer_id == customer_id,
    )
    license_obj = db.scalar(stmt)
    if license_obj is None:
        raise LicenseNotFoundError(f"Brazil license {license_id} not found for customer {customer_id}")
    return license_obj
