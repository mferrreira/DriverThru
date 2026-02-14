from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.modules.customers.errors import CustomerNotFoundError
from app.modules.customers.models import BrazilDriverLicense, Customer, CustomerAddress, NJDriverLicense, Passport
from app.modules.customers.schemas import CustomerCreate, CustomerListResponse, CustomerUpdate, NJDriverLicenseCreate

from .shared import get_customer_query


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
    result = db.scalar(get_customer_query(customer_id=customer_id))
    if result is None or not result.active:
        raise CustomerNotFoundError(f"Customer {customer_id} not found")
    return result


def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    customer = Customer(
        **payload.model_dump(
            exclude={"addresses", "nj_driver_licenses", "brazil_driver_licenses", "passports"}
        )
    )

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


def _build_nj_license_from_create(payload: NJDriverLicenseCreate) -> NJDriverLicense:
    from app.modules.customers.models import NJDriverLicenseEndorsement, NJDriverLicenseRestriction

    nj_payload = payload.model_dump(exclude={"endorsements", "restrictions"})
    nj_license = NJDriverLicense(**nj_payload)
    nj_license.endorsements = [NJDriverLicenseEndorsement(code=item) for item in payload.endorsements]
    nj_license.restrictions = [NJDriverLicenseRestriction(code=item) for item in payload.restrictions]
    return nj_license
