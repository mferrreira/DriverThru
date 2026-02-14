from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.customers.schemas import NJDriverLicenseCreate, NJDriverLicenseRead, NJDriverLicenseUpdate
from app.modules.customers.services.nj_licenses import (
    create_nj_license,
    deactivate_nj_license,
    get_nj_license_or_404,
    list_nj_licenses,
    renew_nj_license,
    update_nj_license,
)

from .helpers import raise_not_found, raise_unprocessable

router = APIRouter()


@router.get("/{customer_id}/nj-driver-licenses", response_model=list[NJDriverLicenseRead])
def list_nj_licenses_route(
    customer_id: int,
    include_inactive: bool = Query(default=False),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[NJDriverLicenseRead]:
    try:
        return list_nj_licenses(db=db, customer_id=customer_id, include_inactive=include_inactive, search=search)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.get("/{customer_id}/nj-driver-licenses/{license_id}", response_model=NJDriverLicenseRead)
def get_nj_license_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> NJDriverLicenseRead:
    try:
        return get_nj_license_or_404(db=db, customer_id=customer_id, license_id=license_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.post("/{customer_id}/nj-driver-licenses", response_model=NJDriverLicenseRead, status_code=status.HTTP_201_CREATED)
def create_nj_license_route(
    customer_id: int,
    payload: NJDriverLicenseCreate,
    db: Session = Depends(get_db),
) -> NJDriverLicenseRead:
    try:
        return create_nj_license(db=db, customer_id=customer_id, payload=payload)
    except IntegrityError as exc:
        raise_unprocessable(db, "Invalid NJ license payload.", exc)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.patch("/{customer_id}/nj-driver-licenses/{license_id}", response_model=NJDriverLicenseRead)
def update_nj_license_route(
    customer_id: int,
    license_id: int,
    payload: NJDriverLicenseUpdate,
    db: Session = Depends(get_db),
) -> NJDriverLicenseRead:
    try:
        return update_nj_license(db=db, customer_id=customer_id, license_id=license_id, payload=payload)
    except IntegrityError as exc:
        raise_unprocessable(db, "Invalid NJ license payload.", exc)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.post(
    "/{customer_id}/nj-driver-licenses/{license_id}/renew",
    response_model=NJDriverLicenseRead,
    status_code=status.HTTP_201_CREATED,
)
def renew_nj_license_route(
    customer_id: int,
    license_id: int,
    payload: NJDriverLicenseCreate,
    db: Session = Depends(get_db),
) -> NJDriverLicenseRead:
    try:
        return renew_nj_license(db=db, customer_id=customer_id, license_id=license_id, payload=payload)
    except IntegrityError as exc:
        raise_unprocessable(db, "Invalid NJ license payload.", exc)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.delete("/{customer_id}/nj-driver-licenses/{license_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_nj_license_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        deactivate_nj_license(db=db, customer_id=customer_id, license_id=license_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
