from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.customers.errors import LicenseNotFoundError
from app.modules.customers.models import NJDriverLicense, NJDriverLicenseEndorsement, NJDriverLicenseRestriction
from app.modules.customers.schemas import NJDriverLicenseCreate, NJDriverLicenseUpdate

from .customers import get_customer_or_404
from .shared import clear_current_flags


def list_nj_licenses(
    db: Session,
    customer_id: int,
    include_inactive: bool = False,
    search: str | None = None,
) -> list[NJDriverLicense]:
    get_customer_or_404(db, customer_id)
    stmt = (
        select(NJDriverLicense)
        .where(NJDriverLicense.customer_id == customer_id)
        .order_by(NJDriverLicense.created_at.desc())
        .options(
            selectinload(NJDriverLicense.endorsements),
            selectinload(NJDriverLicense.restrictions),
        )
    )
    if not include_inactive:
        stmt = stmt.where(NJDriverLicense.active.is_(True))
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(NJDriverLicense.license_number_encrypted.ilike(term))
    return list(db.scalars(stmt).all())


def create_nj_license(db: Session, customer_id: int, payload: NJDriverLicenseCreate) -> NJDriverLicense:
    get_customer_or_404(db, customer_id)
    if payload.is_current:
        clear_current_flags(db, model=NJDriverLicense, customer_id=customer_id)
    license_obj = _build_nj_license_from_create(payload)
    license_obj.customer_id = customer_id
    db.add(license_obj)
    db.commit()
    db.refresh(license_obj)
    return get_nj_license_or_404(db, customer_id, license_obj.id)


def update_nj_license(
    db: Session,
    customer_id: int,
    license_id: int,
    payload: NJDriverLicenseUpdate,
) -> NJDriverLicense:
    license_obj = get_nj_license_or_404(db, customer_id, license_id)
    update_data = payload.model_dump(exclude_unset=True, exclude={"endorsements", "restrictions"})
    for field, value in update_data.items():
        setattr(license_obj, field, value)

    if payload.endorsements is not None:
        license_obj.endorsements = [NJDriverLicenseEndorsement(code=item) for item in payload.endorsements]
    if payload.restrictions is not None:
        license_obj.restrictions = [NJDriverLicenseRestriction(code=item) for item in payload.restrictions]
    if payload.is_current:
        clear_current_flags(db, model=NJDriverLicense, customer_id=customer_id, except_id=license_id)

    db.commit()
    db.refresh(license_obj)
    return get_nj_license_or_404(db, customer_id, license_obj.id)


def renew_nj_license(
    db: Session,
    customer_id: int,
    license_id: int,
    payload: NJDriverLicenseCreate,
) -> NJDriverLicense:
    current = get_nj_license_or_404(db, customer_id, license_id)
    current.is_current = False

    new_license = _build_nj_license_from_create(payload)
    new_license.customer_id = customer_id
    new_license.is_current = True
    db.add(new_license)
    db.commit()
    db.refresh(new_license)
    return get_nj_license_or_404(db, customer_id, new_license.id)


def deactivate_nj_license(db: Session, customer_id: int, license_id: int) -> None:
    license_obj = get_nj_license_or_404(db, customer_id, license_id)
    license_obj.active = False
    license_obj.is_current = False
    db.commit()


def get_nj_license_or_404(db: Session, customer_id: int, license_id: int) -> NJDriverLicense:
    stmt = (
        select(NJDriverLicense)
        .where(NJDriverLicense.id == license_id, NJDriverLicense.customer_id == customer_id)
        .options(
            selectinload(NJDriverLicense.endorsements),
            selectinload(NJDriverLicense.restrictions),
        )
    )
    license_obj = db.scalar(stmt)
    if license_obj is None:
        raise LicenseNotFoundError(f"NJ license {license_id} not found for customer {customer_id}")
    return license_obj


def _build_nj_license_from_create(payload: NJDriverLicenseCreate) -> NJDriverLicense:
    nj_payload = payload.model_dump(exclude={"endorsements", "restrictions"})
    nj_license = NJDriverLicense(**nj_payload)
    nj_license.endorsements = [NJDriverLicenseEndorsement(code=item) for item in payload.endorsements]
    nj_license.restrictions = [NJDriverLicenseRestriction(code=item) for item in payload.restrictions]
    return nj_license
