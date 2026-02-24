from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.customers.schemas import CustomerCreate, CustomerListResponse, CustomerRead, CustomerUpdate
from app.modules.customers.services import (
    create_customer,
    delete_customer_photo,
    deactivate_customer,
    get_customer_or_404,
    get_customer_photo,
    list_customers,
    upload_customer_photo,
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


@router.post("/{customer_id}/photo", response_model=CustomerRead)
async def upload_customer_photo_route(
    customer_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> CustomerRead:
    try:
        payload = await file.read()
        return upload_customer_photo(
            db=db,
            customer_id=customer_id,
            payload=payload,
            file_name=file.filename,
            content_type=file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.delete("/{customer_id}/photo", response_model=CustomerRead)
def delete_customer_photo_route(customer_id: int, db: Session = Depends(get_db)) -> CustomerRead:
    try:
        return delete_customer_photo(db=db, customer_id=customer_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.get("/{customer_id}/photo")
def get_customer_photo_route(customer_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    try:
        customer = get_customer_or_404(db=db, customer_id=customer_id)
        payload, content_type, file_name = get_customer_photo(customer)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)

    return StreamingResponse(
        iter([payload]),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{file_name}"', "Cache-Control": "no-store"},
    )
