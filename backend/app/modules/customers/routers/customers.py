from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.customers.schemas import CustomerCreate, CustomerListResponse, CustomerRead, CustomerUpdate
from app.modules.customers.services.customers import (
    create_customer,
    deactivate_customer,
    get_customer_or_404,
    list_customers,
    update_customer,
)

from .helpers import raise_customer_integrity_error, raise_not_found

router = APIRouter()


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
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer_route(payload: CustomerCreate, db: Session = Depends(get_db)) -> CustomerRead:
    try:
        return create_customer(db=db, payload=payload)
    except IntegrityError as exc:
        raise_customer_integrity_error(db, exc)


@router.patch("/{customer_id}", response_model=CustomerRead)
def update_customer_route(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
) -> CustomerRead:
    try:
        return update_customer(db=db, customer_id=customer_id, payload=payload)
    except IntegrityError as exc:
        raise_customer_integrity_error(db, exc)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_customer_route(customer_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        deactivate_customer(db=db, customer_id=customer_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
