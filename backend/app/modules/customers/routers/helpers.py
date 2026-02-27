from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.customers.errors import (
    CustomerNotFoundError,
    CustomerDocumentFileNotFoundError,
    CustomerPhotoNotFoundError,
    LicenseNotFoundError,
    PassportNotFoundError,
)


def raise_not_found(exc: Exception) -> None:
    if isinstance(
        exc,
        (
            CustomerNotFoundError,
            CustomerPhotoNotFoundError,
            CustomerDocumentFileNotFoundError,
            LicenseNotFoundError,
            PassportNotFoundError,
        ),
    ):
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
    orig = str(getattr(exc, "orig", exc))
    resolved_detail = detail
    if "uq_nj_dl_endorsement_code" in orig:
        resolved_detail = "Duplicate endorsement code is not allowed."
    elif "uq_nj_dl_restriction_code" in orig:
        resolved_detail = "Duplicate restriction code is not allowed."
    elif "ck_nj_dl_dates_valid" in orig:
        resolved_detail = "expiration_date must be greater than or equal to issue_date."
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=resolved_detail) from exc
