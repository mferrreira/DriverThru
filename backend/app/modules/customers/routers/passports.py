from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.customers.schemas import PassportCreate, PassportRead, PassportUpdate
from app.modules.customers.services.passports import (
    create_passport,
    deactivate_passport,
    get_passport_or_404,
    list_passports,
    renew_passport,
    update_passport,
)

from .helpers import raise_not_found

router = APIRouter()


@router.get("/{customer_id}/passports", response_model=list[PassportRead])
def list_passports_route(
    customer_id: int,
    include_inactive: bool = Query(default=False),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[PassportRead]:
    try:
        return list_passports(db=db, customer_id=customer_id, include_inactive=include_inactive, search=search)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.get("/{customer_id}/passports/{passport_id}", response_model=PassportRead)
def get_passport_route(customer_id: int, passport_id: int, db: Session = Depends(get_db)) -> PassportRead:
    try:
        return get_passport_or_404(db=db, customer_id=customer_id, passport_id=passport_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.post("/{customer_id}/passports", response_model=PassportRead, status_code=status.HTTP_201_CREATED)
def create_passport_route(
    customer_id: int,
    payload: PassportCreate,
    db: Session = Depends(get_db),
) -> PassportRead:
    try:
        return create_passport(db=db, customer_id=customer_id, payload=payload)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.patch("/{customer_id}/passports/{passport_id}", response_model=PassportRead)
def update_passport_route(
    customer_id: int,
    passport_id: int,
    payload: PassportUpdate,
    db: Session = Depends(get_db),
) -> PassportRead:
    try:
        return update_passport(db=db, customer_id=customer_id, passport_id=passport_id, payload=payload)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.post("/{customer_id}/passports/{passport_id}/renew", response_model=PassportRead, status_code=status.HTTP_201_CREATED)
def renew_passport_route(
    customer_id: int,
    passport_id: int,
    payload: PassportCreate,
    db: Session = Depends(get_db),
) -> PassportRead:
    try:
        return renew_passport(db=db, customer_id=customer_id, passport_id=passport_id, payload=payload)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.delete("/{customer_id}/passports/{passport_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_passport_route(customer_id: int, passport_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        deactivate_passport(db=db, customer_id=customer_id, passport_id=passport_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
