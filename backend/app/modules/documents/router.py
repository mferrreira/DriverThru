from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.documents.schemas import (
    GenerateDocumentRequest,
    GenerateDocumentResponse,
    GeneratedDocumentListResponse,
    PrefillDocumentRequest,
    PrefillDocumentResponse,
    TemplateFieldListResponse,
    TemplateInfo,
    TemplateKey,
)
from app.modules.documents.service import (
    CustomerNotFoundError,
    DocumentNotFoundError,
    InvalidSelectionError,
    TemplateNotFoundError,
    download_generated_document,
    generate_document,
    list_generated_documents,
    list_template_fields,
    list_templates,
    prefill_document_fields,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/templates", response_model=list[TemplateInfo])
def get_templates() -> list[TemplateInfo]:
    return list_templates()

@router.get("/templates/{template_key}/fields", response_model=TemplateFieldListResponse)
def get_template_fields(template_key: TemplateKey) -> TemplateFieldListResponse:
    try:
        fields = list_template_fields(template_key)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    template = next((item for item in list_templates() if item.key == template_key), None)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return TemplateFieldListResponse(template=template, fields=fields)

@router.post("/generate", response_model=GenerateDocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(payload: GenerateDocumentRequest, db: Session = Depends(get_db)) -> GenerateDocumentResponse:
    try:
        return generate_document(
            db=db,
            customer_id=payload.customer_id,
            template_key=payload.template_key,
            nj_driver_license_id=payload.nj_driver_license_id,
            brazil_driver_license_id=payload.brazil_driver_license_id,
            passport_id=payload.passport_id,
            field_overrides=payload.field_overrides,
        )
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidSelectionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/prefill", response_model=PrefillDocumentResponse)
def prefill_document(payload: PrefillDocumentRequest, db: Session = Depends(get_db)) -> PrefillDocumentResponse:
    try:
        return prefill_document_fields(
            db=db,
            customer_id=payload.customer_id,
            template_key=payload.template_key,
            nj_driver_license_id=payload.nj_driver_license_id,
            brazil_driver_license_id=payload.brazil_driver_license_id,
            passport_id=payload.passport_id,
        )
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidSelectionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/download")
def download_document(object_key: str = Query(..., min_length=1)) -> StreamingResponse:
    try:
        payload, file_name = download_generated_document(object_key)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return StreamingResponse(
        iter([payload]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


@router.get("/generated", response_model=GeneratedDocumentListResponse)
def list_generated_documents_route(
    customer_id: int | None = Query(default=None, ge=1),
    template_key: TemplateKey | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
) -> GeneratedDocumentListResponse:
    return list_generated_documents(customer_id=customer_id, template_key=template_key, limit=limit)
