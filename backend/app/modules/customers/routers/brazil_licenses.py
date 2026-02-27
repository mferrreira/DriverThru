from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.customers.schemas import (
    BrazilDriverLicenseCreate,
    BrazilDriverLicenseRead,
    BrazilDriverLicenseUpdate,
    StagedDocumentFileResponse,
)
from app.modules.customers.services.brazil_licenses import (
    create_brazil_license,
    delete_brazil_license,
    deactivate_brazil_license,
    get_brazil_license_or_404,
    list_brazil_licenses,
    renew_brazil_license,
    update_brazil_license,
)
from app.modules.customers.services.document_files import (
    delete_brazil_license_document_file,
    delete_staged_document_file,
    get_brazil_license_document_file,
    get_staged_document_file,
    upload_staged_document_file,
    upload_brazil_license_document_file,
)

from .helpers import raise_not_found

router = APIRouter()
BR_DOC_TYPE = "brazil-license"


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


@router.post("/{customer_id}/brazil-driver-licenses/staged-file", response_model=StagedDocumentFileResponse)
async def upload_brazil_license_staged_file_route(
    customer_id: int,
    file: UploadFile = File(...),
) -> StagedDocumentFileResponse:
    try:
        payload = await file.read()
        object_key, content_type, file_name = upload_staged_document_file(
            customer_id=customer_id,
            doc_type=BR_DOC_TYPE,
            payload=payload,
            file_name=file.filename,
            content_type=file.content_type,
        )
        return StagedDocumentFileResponse(object_key=object_key, content_type=content_type, file_name=file_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/{customer_id}/brazil-driver-licenses/staged-file")
def get_brazil_license_staged_file_route(customer_id: int, object_key: str = Query(...)) -> StreamingResponse:
    try:
        payload, content_type, file_name = get_staged_document_file(customer_id=customer_id, doc_type=BR_DOC_TYPE, object_key=object_key)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return StreamingResponse(
        iter([payload]),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{file_name}"', "Cache-Control": "no-store"},
    )


@router.delete("/{customer_id}/brazil-driver-licenses/staged-file", status_code=status.HTTP_204_NO_CONTENT)
def delete_brazil_license_staged_file_route(customer_id: int, object_key: str = Query(...)) -> Response:
    try:
        delete_staged_document_file(customer_id=customer_id, doc_type=BR_DOC_TYPE, object_key=object_key)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


@router.post("/{customer_id}/brazil-driver-licenses/{license_id}/file", response_model=BrazilDriverLicenseRead)
async def upload_brazil_license_file_route(
    customer_id: int,
    license_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> BrazilDriverLicenseRead:
    try:
        payload = await file.read()
        return upload_brazil_license_document_file(
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


@router.get("/{customer_id}/brazil-driver-licenses/{license_id}/file")
def get_brazil_license_file_route(customer_id: int, license_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    try:
        payload, content_type, file_name = get_brazil_license_document_file(db=db, customer_id=customer_id, license_id=license_id)
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
    return StreamingResponse(
        iter([payload]),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{file_name}"', "Cache-Control": "no-store"},
    )


@router.delete("/{customer_id}/brazil-driver-licenses/{license_id}/file", response_model=BrazilDriverLicenseRead)
def delete_brazil_license_file_route(
    customer_id: int,
    license_id: int,
    db: Session = Depends(get_db),
) -> BrazilDriverLicenseRead:
    try:
        return delete_brazil_license_document_file(db=db, customer_id=customer_id, license_id=license_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise_not_found(exc)
