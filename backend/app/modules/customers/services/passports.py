from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.modules.customers.errors import PassportNotFoundError
from app.modules.customers.models import Passport
from app.modules.customers.schemas import PassportCreate, PassportUpdate

from .customers import get_customer_or_404
from .shared import clear_current_flags


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
        clear_current_flags(db, model=Passport, customer_id=customer_id)
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
        clear_current_flags(db, model=Passport, customer_id=customer_id, except_id=passport_id)
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


def delete_passport(db: Session, customer_id: int, passport_id: int) -> None:
    passport = get_passport_or_404(db, customer_id, passport_id)
    db.delete(passport)
    db.commit()


def get_passport_or_404(db: Session, customer_id: int, passport_id: int) -> Passport:
    stmt = select(Passport).where(Passport.id == passport_id, Passport.customer_id == customer_id)
    passport = db.scalar(stmt)
    if passport is None:
        raise PassportNotFoundError(f"Passport {passport_id} not found for customer {customer_id}")
    return passport
