from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.customers.schemas import BrazilDriverLicenseCreate, BrazilDriverLicenseRead, BrazilDriverLicenseUpdate
from app.modules.customers.services.brazil_licenses import (
    create_brazil_license,
    delete_brazil_license,
    deactivate_brazil_license,
    get_brazil_license_or_404,
    list_brazil_licenses,
    renew_brazil_license,
    update_brazil_license,
)

from .helpers import raise_not_found

router = APIRouter()


@router.get("/{customer_id}/brazil-driver-licenses", response_model=list[BrazilDriverLicenseRead])
def list_brazil_licenses_route(
    customer_id: int,
    include_inactive: bool = Query(default=False),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[BrazilDriverLicenseRead]:
    try:
        return list_brazil_licenses(db=db, customer_id=customer_id, include_inactive=include_inactive, search=search)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.get("/{customer_id}/brazil-driver-licenses/{license_id}", response_model=BrazilDriverLicenseRead)
def get_brazil_license_route(
    customer_id: int,
    license_id: int,
    db: Session = Depends(get_db),
) -> BrazilDriverLicenseRead:
    try:
        return get_brazil_license_or_404(db=db, customer_id=customer_id, license_id=license_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.post("/{customer_id}/brazil-driver-licenses", response_model=BrazilDriverLicenseRead, status_code=status.HTTP_201_CREATED)
def create_brazil_license_route(
    customer_id: int,
    payload: BrazilDriverLicenseCreate,
    db: Session = Depends(get_db),
) -> BrazilDriverLicenseRead:
    try:
        return create_brazil_license(db=db, customer_id=customer_id, payload=payload)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.patch("/{customer_id}/brazil-driver-licenses/{license_id}", response_model=BrazilDriverLicenseRead)
def update_brazil_license_route(
    customer_id: int,
    license_id: int,
    payload: BrazilDriverLicenseUpdate,
    db: Session = Depends(get_db),
) -> BrazilDriverLicenseRead:
    try:
        return update_brazil_license(db=db, customer_id=customer_id, license_id=license_id, payload=payload)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.post(
    "/{customer_id}/brazil-driver-licenses/{license_id}/renew",
    response_model=BrazilDriverLicenseRead,
    status_code=status.HTTP_201_CREATED,
)
def renew_brazil_license_route(
    customer_id: int,
    license_id: int,
    payload: BrazilDriverLicenseCreate,
    db: Session = Depends(get_db),
) -> BrazilDriverLicenseRead:
    try:
        return renew_brazil_license(db=db, customer_id=customer_id, license_id=license_id, payload=payload)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.delete("/{customer_id}/brazil-driver-licenses/{license_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_brazil_license_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        deactivate_brazil_license(db=db, customer_id=customer_id, license_id=license_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{customer_id}/brazil-driver-licenses/{license_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def delete_brazil_license_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        delete_brazil_license(db=db, customer_id=customer_id, license_id=license_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
