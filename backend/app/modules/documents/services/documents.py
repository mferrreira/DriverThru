from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.documents.constants import TEMPLATE_FILES
from app.modules.documents.customer_values import build_pdf_value_map, get_active_customer
from app.modules.documents.errors import (
    CustomerNotFoundError,
    DocumentNotFoundError,
    InvalidSelectionError,
    TemplateNotFoundError,
)
from app.modules.documents.pdf_utils import list_template_fields, render_template_pdf, resolve_fields_for_template
from app.modules.documents.schemas import (
    GenerateDocumentResponse,
    GeneratedDocumentListResponse,
    PrefillDocumentResponse,
    TemplateInfo,
    TemplateKey,
)
from app.modules.documents.storage import (
    download_generated_document as storage_download_generated_document,
    list_generated_documents as storage_list_generated_documents,
    save_generated_document,
)


def list_templates() -> list[TemplateInfo]:
    return [TemplateInfo(key=key, file_name=file_name) for key, file_name in TEMPLATE_FILES.items()]


def generate_document(
    db: Session,
    customer_id: int,
    template_key: TemplateKey,
    nj_driver_license_id: int | None = None,
    brazil_driver_license_id: int | None = None,
    passport_id: int | None = None,
    field_overrides: dict[str, str] | None = None,
) -> GenerateDocumentResponse:
    customer = get_active_customer(db, customer_id)
    if customer is None:
        raise CustomerNotFoundError(f"Customer {customer_id} not found")

    values = build_pdf_value_map(
        customer=customer,
        nj_driver_license_id=nj_driver_license_id,
        brazil_driver_license_id=brazil_driver_license_id,
        passport_id=passport_id,
    )
    if field_overrides:
        values.update(field_overrides)

    payload, matched_fields, total_template_fields = render_template_pdf(template_key=template_key, values=values)
    object_key, generated_at = save_generated_document(
        customer_id=customer.id,
        customer_name=f"{customer.first_name} {customer.last_name}",
        template_key=template_key,
        payload=payload,
    )

    return GenerateDocumentResponse(
        template_key=template_key,
        bucket=settings.MINIO_BUCKET,
        object_key=object_key,
        generated_at=generated_at,
        matched_fields=matched_fields,
        total_template_fields=total_template_fields,
    )


def prefill_document_fields(
    db: Session,
    customer_id: int,
    template_key: TemplateKey,
    nj_driver_license_id: int | None = None,
    brazil_driver_license_id: int | None = None,
    passport_id: int | None = None,
) -> PrefillDocumentResponse:
    customer = get_active_customer(db, customer_id)
    if customer is None:
        raise CustomerNotFoundError(f"Customer {customer_id} not found")

    values = build_pdf_value_map(
        customer=customer,
        nj_driver_license_id=nj_driver_license_id,
        brazil_driver_license_id=brazil_driver_license_id,
        passport_id=passport_id,
    )
    prefilled_fields = resolve_fields_for_template(template_key=template_key, values=values)
    return PrefillDocumentResponse(template_key=template_key, prefilled_fields=prefilled_fields)


def download_generated_document(object_key: str) -> tuple[bytes, str]:
    return storage_download_generated_document(object_key)


def list_generated_documents(
    customer_id: int | None = None,
    template_key: TemplateKey | None = None,
    limit: int = 200,
) -> GeneratedDocumentListResponse:
    return storage_list_generated_documents(customer_id=customer_id, template_key=template_key, limit=limit)


__all__ = [
    "CustomerNotFoundError",
    "DocumentNotFoundError",
    "InvalidSelectionError",
    "TemplateNotFoundError",
    "download_generated_document",
    "generate_document",
    "list_generated_documents",
    "list_template_fields",
    "list_templates",
    "prefill_document_fields",
]
