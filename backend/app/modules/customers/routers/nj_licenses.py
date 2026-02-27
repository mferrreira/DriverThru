from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.customers.schemas import NJDriverLicenseCreate, NJDriverLicenseRead, NJDriverLicenseUpdate, StagedDocumentFileResponse
from app.modules.customers.services.nj_licenses import (
    create_nj_license,
    delete_nj_license,
    deactivate_nj_license,
    get_nj_license_or_404,
    list_nj_licenses,
    renew_nj_license,
    update_nj_license,
)
from app.modules.customers.services.document_files import (
    delete_nj_license_document_file,
    delete_staged_document_file,
    get_nj_license_document_file,
    get_staged_document_file,
    upload_staged_document_file,
    upload_nj_license_document_file,
)

from .helpers import raise_not_found, raise_unprocessable

router = APIRouter()
NJ_DOC_TYPE = "nj-license"


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


@router.delete("/{customer_id}/nj-driver-licenses/{license_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def delete_nj_license_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        delete_nj_license(db=db, customer_id=customer_id, license_id=license_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{customer_id}/nj-driver-licenses/staged-file", response_model=StagedDocumentFileResponse)
async def upload_nj_license_staged_file_route(
    customer_id: int,
    file: UploadFile = File(...),
) -> StagedDocumentFileResponse:
    try:
        payload = await file.read()
        object_key, content_type, file_name = upload_staged_document_file(
            customer_id=customer_id,
            doc_type=NJ_DOC_TYPE,
            payload=payload,
            file_name=file.filename,
            content_type=file.content_type,
        )
        return StagedDocumentFileResponse(object_key=object_key, content_type=content_type, file_name=file_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/{customer_id}/nj-driver-licenses/staged-file")
def get_nj_license_staged_file_route(customer_id: int, object_key: str = Query(...)) -> StreamingResponse:
    try:
        payload, content_type, file_name = get_staged_document_file(customer_id=customer_id, doc_type=NJ_DOC_TYPE, object_key=object_key)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return StreamingResponse(
        iter([payload]),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{file_name}"', "Cache-Control": "no-store"},
    )


@router.delete("/{customer_id}/nj-driver-licenses/staged-file", status_code=status.HTTP_204_NO_CONTENT)
def delete_nj_license_staged_file_route(customer_id: int, object_key: str = Query(...)) -> Response:
    try:
        delete_staged_document_file(customer_id=customer_id, doc_type=NJ_DOC_TYPE, object_key=object_key)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{customer_id}/nj-driver-licenses/{license_id}/file", response_model=NJDriverLicenseRead)
async def upload_nj_license_file_route(
    customer_id: int,
    license_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> NJDriverLicenseRead:
    try:
        payload = await file.read()
        return upload_nj_license_document_file(
            db=db,
            customer_id=customer_id,
            license_id=license_id,
            payload=payload,
            file_name=file.filename,
            content_type=file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)


@router.get("/{customer_id}/nj-driver-licenses/{license_id}/file")
def get_nj_license_file_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    try:
        payload, content_type, file_name = get_nj_license_document_file(db=db, customer_id=customer_id, license_id=license_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return StreamingResponse(
        iter([payload]),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{file_name}"', "Cache-Control": "no-store"},
    )


@router.delete("/{customer_id}/nj-driver-licenses/{license_id}/file", response_model=NJDriverLicenseRead)
def delete_nj_license_file_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> NJDriverLicenseRead:
    try:
        return delete_nj_license_document_file(db=db, customer_id=customer_id, license_id=license_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
