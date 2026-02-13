from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.customers.schemas import (
    BrazilDriverLicenseCreate,
    BrazilDriverLicenseRead,
    BrazilDriverLicenseUpdate,
    CustomerCreate,
    CustomerListResponse,
    CustomerRead,
    CustomerUpdate,
    NJDriverLicenseCreate,
    NJDriverLicenseRead,
    NJDriverLicenseUpdate,
    PassportCreate,
    PassportRead,
    PassportUpdate,
)
from app.modules.customers.service import (
    LicenseNotFoundError,
    PassportNotFoundError,
    CustomerNotFoundError,
    create_brazil_license,
    create_customer,
    create_nj_license,
    create_passport,
    deactivate_brazil_license,
    deactivate_customer,
    deactivate_nj_license,
    deactivate_passport,
    get_brazil_license_or_404,
    get_customer_or_404,
    get_nj_license_or_404,
    get_passport_or_404,
    list_brazil_licenses,
    list_customers,
    list_nj_licenses,
    list_passports,
    renew_brazil_license,
    renew_nj_license,
    renew_passport,
    update_brazil_license,
    update_nj_license,
    update_passport,
    update_customer,
)

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=CustomerListResponse)
def list_customers_route(
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
) -> CustomerListResponse:
    return list_customers(db=db, page=page, size=size, search=search)


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer_route(customer_id: int, db: Session = Depends(get_db)) -> CustomerRead:
    try:
        return get_customer_or_404(db=db, customer_id=customer_id)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer_route(payload: CustomerCreate, db: Session = Depends(get_db)) -> CustomerRead:
    try:
        return create_customer(db=db, payload=payload)
    except IntegrityError as exc:
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


@router.patch("/{customer_id}", response_model=CustomerRead)
def update_customer_route(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
) -> CustomerRead:
    try:
        return update_customer(db=db, customer_id=customer_id, payload=payload)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except IntegrityError as exc:
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


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_customer_route(customer_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        deactivate_customer(db=db, customer_id=customer_id)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{customer_id}/nj-driver-licenses", response_model=list[NJDriverLicenseRead])
def list_nj_licenses_route(
    customer_id: int,
    include_inactive: bool = Query(default=False),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[NJDriverLicenseRead]:
    try:
        return list_nj_licenses(db=db, customer_id=customer_id, include_inactive=include_inactive, search=search)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{customer_id}/nj-driver-licenses/{license_id}", response_model=NJDriverLicenseRead)
def get_nj_license_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> NJDriverLicenseRead:
    try:
        return get_nj_license_or_404(db=db, customer_id=customer_id, license_id=license_id)
    except LicenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/{customer_id}/nj-driver-licenses",
    response_model=NJDriverLicenseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_nj_license_route(
    customer_id: int,
    payload: NJDriverLicenseCreate,
    db: Session = Depends(get_db),
) -> NJDriverLicenseRead:
    try:
        return create_nj_license(db=db, customer_id=customer_id, payload=payload)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid NJ license payload.",
        ) from exc


@router.patch("/{customer_id}/nj-driver-licenses/{license_id}", response_model=NJDriverLicenseRead)
def update_nj_license_route(
    customer_id: int,
    license_id: int,
    payload: NJDriverLicenseUpdate,
    db: Session = Depends(get_db),
) -> NJDriverLicenseRead:
    try:
        return update_nj_license(db=db, customer_id=customer_id, license_id=license_id, payload=payload)
    except LicenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid NJ license payload.",
        ) from exc


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
    except LicenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid NJ license payload.",
        ) from exc


@router.delete("/{customer_id}/nj-driver-licenses/{license_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_nj_license_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        deactivate_nj_license(db=db, customer_id=customer_id, license_id=license_id)
    except LicenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{customer_id}/brazil-driver-licenses", response_model=list[BrazilDriverLicenseRead])
def list_brazil_licenses_route(
    customer_id: int,
    include_inactive: bool = Query(default=False),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[BrazilDriverLicenseRead]:
    try:
        return list_brazil_licenses(
            db=db,
            customer_id=customer_id,
            include_inactive=include_inactive,
            search=search,
        )
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{customer_id}/brazil-driver-licenses/{license_id}", response_model=BrazilDriverLicenseRead)
def get_brazil_license_route(
    customer_id: int,
    license_id: int,
    db: Session = Depends(get_db),
) -> BrazilDriverLicenseRead:
    try:
        return get_brazil_license_or_404(db=db, customer_id=customer_id, license_id=license_id)
    except LicenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/{customer_id}/brazil-driver-licenses",
    response_model=BrazilDriverLicenseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_brazil_license_route(
    customer_id: int,
    payload: BrazilDriverLicenseCreate,
    db: Session = Depends(get_db),
) -> BrazilDriverLicenseRead:
    try:
        return create_brazil_license(db=db, customer_id=customer_id, payload=payload)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{customer_id}/brazil-driver-licenses/{license_id}", response_model=BrazilDriverLicenseRead)
def update_brazil_license_route(
    customer_id: int,
    license_id: int,
    payload: BrazilDriverLicenseUpdate,
    db: Session = Depends(get_db),
) -> BrazilDriverLicenseRead:
    try:
        return update_brazil_license(db=db, customer_id=customer_id, license_id=license_id, payload=payload)
    except LicenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


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
    except LicenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{customer_id}/brazil-driver-licenses/{license_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_brazil_license_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        deactivate_brazil_license(db=db, customer_id=customer_id, license_id=license_id)
    except LicenseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{customer_id}/passports", response_model=list[PassportRead])
def list_passports_route(
    customer_id: int,
    include_inactive: bool = Query(default=False),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[PassportRead]:
    try:
        return list_passports(
            db=db,
            customer_id=customer_id,
            include_inactive=include_inactive,
            search=search,
        )
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{customer_id}/passports/{passport_id}", response_model=PassportRead)
def get_passport_route(customer_id: int, passport_id: int, db: Session = Depends(get_db)) -> PassportRead:
    try:
        return get_passport_or_404(db=db, customer_id=customer_id, passport_id=passport_id)
    except PassportNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/{customer_id}/passports", response_model=PassportRead, status_code=status.HTTP_201_CREATED)
def create_passport_route(
    customer_id: int,
    payload: PassportCreate,
    db: Session = Depends(get_db),
) -> PassportRead:
    try:
        return create_passport(db=db, customer_id=customer_id, payload=payload)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{customer_id}/passports/{passport_id}", response_model=PassportRead)
def update_passport_route(
    customer_id: int,
    passport_id: int,
    payload: PassportUpdate,
    db: Session = Depends(get_db),
) -> PassportRead:
    try:
        return update_passport(db=db, customer_id=customer_id, passport_id=passport_id, payload=payload)
    except PassportNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/{customer_id}/passports/{passport_id}/renew",
    response_model=PassportRead,
    status_code=status.HTTP_201_CREATED,
)
def renew_passport_route(
    customer_id: int,
    passport_id: int,
    payload: PassportCreate,
    db: Session = Depends(get_db),
) -> PassportRead:
    try:
        return renew_passport(db=db, customer_id=customer_id, passport_id=passport_id, payload=payload)
    except PassportNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{customer_id}/passports/{passport_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_passport_route(customer_id: int, passport_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        deactivate_passport(db=db, customer_id=customer_id, passport_id=passport_id)
    except PassportNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
