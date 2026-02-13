from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.modules.customers.models import (
    BrazilDriverLicense,
    Customer,
    CustomerAddress,
    NJDriverLicense,
    NJDriverLicenseEndorsement,
    NJDriverLicenseRestriction,
    Passport,
)
from app.modules.customers.schemas import (
    BrazilDriverLicenseCreate,
    BrazilDriverLicenseUpdate,
    CustomerCreate,
    CustomerListResponse,
    CustomerUpdate,
    NJDriverLicenseCreate,
    NJDriverLicenseUpdate,
    PassportCreate,
    PassportUpdate,
)


class CustomerNotFoundError(ValueError):
    pass


class LicenseNotFoundError(ValueError):
    pass


class PassportNotFoundError(ValueError):
    pass


def list_customers(
    db: Session,
    page: int = 1,
    size: int = 20,
    search: str | None = None,
) -> CustomerListResponse:
    conditions = [Customer.active.is_(True)]
    if search:
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Customer.first_name.ilike(term),
                Customer.last_name.ilike(term),
                Customer.email.ilike(term),
                Customer.phone_number.ilike(term),
            )
        )

    total = db.scalar(select(func.count(Customer.id)).where(*conditions)) or 0

    stmt = (
        select(Customer)
        .where(*conditions)
        .order_by(Customer.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    items = list(db.scalars(stmt).all())
    return CustomerListResponse(items=items, total=total, page=page, size=size)


def get_customer_or_404(db: Session, customer_id: int) -> Customer:
    customer = _get_customer_query(customer_id=customer_id)
    result = db.scalar(customer)
    if result is None or not result.active:
        raise CustomerNotFoundError(f"Customer {customer_id} not found")
    return result


def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    customer = Customer(**payload.model_dump(exclude={"addresses", "nj_driver_licenses", "brazil_driver_licenses", "passports"}))

    for address_data in payload.addresses:
        customer.addresses.append(CustomerAddress(**address_data.model_dump()))

    for nj_data in payload.nj_driver_licenses:
        customer.nj_driver_licenses.append(_build_nj_license_from_create(nj_data))

    for br_data in payload.brazil_driver_licenses:
        customer.brazil_driver_licenses.append(BrazilDriverLicense(**br_data.model_dump()))

    for passport_data in payload.passports:
        customer.passports.append(Passport(**passport_data.model_dump()))

    db.add(customer)
    db.commit()
    db.refresh(customer)
    return get_customer_or_404(db, customer.id)


def update_customer(db: Session, customer_id: int, payload: CustomerUpdate) -> Customer:
    customer = get_customer_or_404(db, customer_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return get_customer_or_404(db, customer.id)


def deactivate_customer(db: Session, customer_id: int) -> None:
    customer = get_customer_or_404(db, customer_id)
    customer.active = False
    db.commit()


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
        _clear_current_nj_license(db, customer_id)
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
        _clear_current_nj_license(db, customer_id, except_id=license_id)

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
        _clear_current_brazil_license(db, customer_id)
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
        _clear_current_brazil_license(db, customer_id, except_id=license_id)
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


def list_passports(
    db: Session,
    customer_id: int,
    include_inactive: bool = False,
    search: str | None = None,
) -> list[Passport]:
    get_customer_or_404(db, customer_id)
    stmt = select(Passport).where(Passport.customer_id == customer_id).order_by(Passport.created_at.desc())
    if not include_inactive:
        stmt = stmt.where(Passport.active.is_(True))
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Passport.passport_number_encrypted.ilike(term),
                Passport.surname.ilike(term),
                Passport.given_name.ilike(term),
            )
        )
    return list(db.scalars(stmt).all())


def create_passport(db: Session, customer_id: int, payload: PassportCreate) -> Passport:
    get_customer_or_404(db, customer_id)
    if payload.is_current:
        _clear_current_passport(db, customer_id)
    passport = Passport(customer_id=customer_id, **payload.model_dump())
    db.add(passport)
    db.commit()
    db.refresh(passport)
    return passport


def update_passport(db: Session, customer_id: int, passport_id: int, payload: PassportUpdate) -> Passport:
    passport = get_passport_or_404(db, customer_id, passport_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(passport, field, value)
    if payload.is_current:
        _clear_current_passport(db, customer_id, except_id=passport_id)
    db.commit()
    db.refresh(passport)
    return passport


def renew_passport(db: Session, customer_id: int, passport_id: int, payload: PassportCreate) -> Passport:
    current = get_passport_or_404(db, customer_id, passport_id)
    current.is_current = False
    data = payload.model_dump()
    data["is_current"] = True
    new_passport = Passport(customer_id=customer_id, **data)
    db.add(new_passport)
    db.commit()
    db.refresh(new_passport)
    return new_passport


def deactivate_passport(db: Session, customer_id: int, passport_id: int) -> None:
    passport = get_passport_or_404(db, customer_id, passport_id)
    passport.active = False
    passport.is_current = False
    db.commit()


def get_passport_or_404(db: Session, customer_id: int, passport_id: int) -> Passport:
    stmt = select(Passport).where(Passport.id == passport_id, Passport.customer_id == customer_id)
    passport = db.scalar(stmt)
    if passport is None:
        raise PassportNotFoundError(f"Passport {passport_id} not found for customer {customer_id}")
    return passport


def _get_customer_query(customer_id: int):
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


def _build_nj_license_from_create(payload: NJDriverLicenseCreate) -> NJDriverLicense:
    nj_payload = payload.model_dump(exclude={"endorsements", "restrictions"})
    nj_license = NJDriverLicense(**nj_payload)
    nj_license.endorsements = [NJDriverLicenseEndorsement(code=item) for item in payload.endorsements]
    nj_license.restrictions = [NJDriverLicenseRestriction(code=item) for item in payload.restrictions]
    return nj_license


def _clear_current_nj_license(db: Session, customer_id: int, except_id: int | None = None) -> None:
    stmt = select(NJDriverLicense).where(
        NJDriverLicense.customer_id == customer_id,
        NJDriverLicense.active.is_(True),
        NJDriverLicense.is_current.is_(True),
    )
    current_items = db.scalars(stmt).all()
    for item in current_items:
        if except_id is not None and item.id == except_id:
            continue
        item.is_current = False


def _clear_current_brazil_license(db: Session, customer_id: int, except_id: int | None = None) -> None:
    stmt = select(BrazilDriverLicense).where(
        BrazilDriverLicense.customer_id == customer_id,
        BrazilDriverLicense.active.is_(True),
        BrazilDriverLicense.is_current.is_(True),
    )
    current_items = db.scalars(stmt).all()
    for item in current_items:
        if except_id is not None and item.id == except_id:
            continue
        item.is_current = False


def _clear_current_passport(db: Session, customer_id: int, except_id: int | None = None) -> None:
    stmt = select(Passport).where(
        Passport.customer_id == customer_id,
        Passport.active.is_(True),
        Passport.is_current.is_(True),
    )
    current_items = db.scalars(stmt).all()
    for item in current_items:
        if except_id is not None and item.id == except_id:
            continue
        item.is_current = False
