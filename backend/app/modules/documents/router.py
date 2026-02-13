from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.modules.documents.schemas import (
    GenerateDocumentRequest,
    GenerateDocumentResponse,
    TemplateFieldListResponse,
    TemplateInfo,
    TemplateKey,
)
from app.modules.documents.service import (
    CustomerNotFoundError,
    TemplateNotFoundError,
    generate_document,
    list_template_fields,
    list_templates,
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
            field_overrides=payload.field_overrides,
        )
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
