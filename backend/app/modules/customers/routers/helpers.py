from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.customers.errors import CustomerNotFoundError, LicenseNotFoundError, PassportNotFoundError


def raise_not_found(exc: Exception) -> None:
    if isinstance(exc, (CustomerNotFoundError, LicenseNotFoundError, PassportNotFoundError)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    raise exc


def raise_customer_integrity_error(db: Session, exc: IntegrityError) -> None:
    db.rollback()
    detail = "Invalid customer data."
    orig = str(getattr(exc, "orig", exc))
    if "ck_customers_height_feet_range" in orig:
        detail = "height_feet must be between 0 and 8."
    elif "ck_customers_height_inches_range" in orig:
        detail = "height_inches must be between 0 and 11."
    elif "ck_customers_weight_positive" in orig:
        detail = "weight_lbs must be greater than 0."
    elif "ck_customers_ssn_presence" in orig:
        detail = "SSN presence is invalid for has_no_ssn flag."
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail) from exc


def raise_unprocessable(db: Session, detail: str, exc: IntegrityError) -> None:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail) from exc
