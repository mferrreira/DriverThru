from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.customers.schemas import PassportCreate, PassportRead, PassportUpdate, StagedDocumentFileResponse
from app.modules.customers.services.passports import (
    create_passport,
    delete_passport,
    deactivate_passport,
    get_passport_or_404,
    list_passports,
    renew_passport,
    update_passport,
)
from app.modules.customers.services.document_files import (
    delete_passport_document_file,
    delete_staged_document_file,
    get_passport_document_file,
    get_staged_document_file,
    upload_staged_document_file,
    upload_passport_document_file,
)

from .helpers import raise_not_found

router = APIRouter()
PASSPORT_DOC_TYPE = "passport"


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


@router.delete("/{customer_id}/passports/{passport_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def delete_passport_route(customer_id: int, passport_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        delete_passport(db=db, customer_id=customer_id, passport_id=passport_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{customer_id}/passports/staged-file", response_model=StagedDocumentFileResponse)
async def upload_passport_staged_file_route(
    customer_id: int,
    file: UploadFile = File(...),
) -> StagedDocumentFileResponse:
    try:
        payload = await file.read()
        object_key, content_type, file_name = upload_staged_document_file(
            customer_id=customer_id,
            doc_type=PASSPORT_DOC_TYPE,
            payload=payload,
            file_name=file.filename,
            content_type=file.content_type,
        )
        return StagedDocumentFileResponse(object_key=object_key, content_type=content_type, file_name=file_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/{customer_id}/passports/staged-file")
def get_passport_staged_file_route(customer_id: int, object_key: str = Query(...)) -> StreamingResponse:
    try:
        payload, content_type, file_name = get_staged_document_file(customer_id=customer_id, doc_type=PASSPORT_DOC_TYPE, object_key=object_key)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return StreamingResponse(
        iter([payload]),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{file_name}"', "Cache-Control": "no-store"},
    )


@router.delete("/{customer_id}/passports/staged-file", status_code=status.HTTP_204_NO_CONTENT)
def delete_passport_staged_file_route(customer_id: int, object_key: str = Query(...)) -> Response:
    try:
        delete_staged_document_file(customer_id=customer_id, doc_type=PASSPORT_DOC_TYPE, object_key=object_key)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{customer_id}/passports/{passport_id}/file", response_model=PassportRead)
async def upload_passport_file_route(
    customer_id: int,
    passport_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> PassportRead:
    try:
        payload = await file.read()
        return upload_passport_document_file(
            db=db,
            customer_id=customer_id,
            passport_id=passport_id,
            payload=payload,
            file_name=file.filename,
            content_type=file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.get("/{customer_id}/passports/{passport_id}/file")
def get_passport_file_route(customer_id: int, passport_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    try:
        payload, content_type, file_name = get_passport_document_file(db=db, customer_id=customer_id, passport_id=passport_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return StreamingResponse(
        iter([payload]),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{file_name}"', "Cache-Control": "no-store"},
    )


@router.delete("/{customer_id}/passports/{passport_id}/file", response_model=PassportRead)
def delete_passport_file_route(customer_id: int, passport_id: int, db: Session = Depends(get_db)) -> PassportRead:
    try:
        return delete_passport_document_file(db=db, customer_id=customer_id, passport_id=passport_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
