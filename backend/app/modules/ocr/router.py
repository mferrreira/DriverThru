from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.modules.ocr.deps import get_ocr_provider
from app.modules.ocr.ports import OCRProvider
from app.modules.ocr.schemas import (
    OCRBrazilLicenseFormPrefillResponse,
    OCRCustomerFormPrefillResponse,
    OCRNJLicenseFormPrefillResponse,
    OCRPassportFormPrefillResponse,
)
from app.modules.ocr.services.prefill_brazil_license_form_from_document_use_case import prefill_brazil_license_form_from_document
from app.modules.ocr.services.prefill_customer_form_from_document_use_case import prefill_customer_form_from_document
from app.modules.ocr.services.prefill_nj_license_form_from_document_use_case import prefill_nj_license_form_from_document
from app.modules.ocr.services.prefill_passport_form_from_document_use_case import prefill_passport_form_from_document

router = APIRouter(prefix="/ocr", tags=["ocr"])

MAX_OCR_UPLOAD_BYTES = 100 * 1024 * 1024 # 100MB
ALLOWED_OCR_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
    "application/octet-stream",
}


@router.get("/provider")
def current_ocr_provider(provider: OCRProvider = Depends(get_ocr_provider)) -> dict[str, str]:
    return {"provider": provider.name.value}


@router.post("/prefill/customer-form", response_model=OCRCustomerFormPrefillResponse)
async def prefill_customer_form_route(
    file: UploadFile = File(...),
    provider: OCRProvider = Depends(get_ocr_provider),
) -> OCRCustomerFormPrefillResponse:
    payload, content_type = await _read_ocr_upload(file)

    try:
        return prefill_customer_form_from_document(provider=provider, payload=payload, content_type=content_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/prefill/passport-form", response_model=OCRPassportFormPrefillResponse)
async def prefill_passport_form_route(
    file: UploadFile = File(...),
    provider: OCRProvider = Depends(get_ocr_provider),
) -> OCRPassportFormPrefillResponse:
    payload, content_type = await _read_ocr_upload(file)
    try:
        return prefill_passport_form_from_document(provider=provider, payload=payload, content_type=content_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/prefill/brazil-license-form", response_model=OCRBrazilLicenseFormPrefillResponse)
async def prefill_brazil_license_form_route(
    file: UploadFile = File(...),
    provider: OCRProvider = Depends(get_ocr_provider),
) -> OCRBrazilLicenseFormPrefillResponse:
    payload, content_type = await _read_ocr_upload(file)
    try:
        return prefill_brazil_license_form_from_document(provider=provider, payload=payload, content_type=content_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/prefill/nj-license-form", response_model=OCRNJLicenseFormPrefillResponse)
async def prefill_nj_license_form_route(
    file: UploadFile = File(...),
    provider: OCRProvider = Depends(get_ocr_provider),
) -> OCRNJLicenseFormPrefillResponse:
    payload, content_type = await _read_ocr_upload(file)
    try:
        return prefill_nj_license_form_from_document(provider=provider, payload=payload, content_type=content_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


async def _read_ocr_upload(file: UploadFile) -> tuple[bytes, str | None]:
    content_type = (file.content_type or "").strip().lower() or None
    filename = (file.filename or "").strip().lower()
    is_pdf_filename = filename.endswith(".pdf")

    normalized_content_type = content_type

    if content_type:
        is_image = content_type.startswith("image/")
        is_allowed_exact = content_type in ALLOWED_OCR_CONTENT_TYPES
        is_pdf_octet_stream = content_type == "application/octet-stream" and is_pdf_filename
        if not (is_image or is_allowed_exact or is_pdf_octet_stream):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unsupported file type for OCR ({content_type}). Use image or PDF.",
            )
        if is_pdf_octet_stream:
            normalized_content_type = "application/pdf"
    elif not is_pdf_filename and "." in filename:
        # Unknown content-type; allow common image extensions and PDF by filename fallback.
        ext = filename.rsplit(".", maxsplit=1)[-1]
        if ext not in {"jpg", "jpeg", "png", "webp", "heic", "heif", "pdf"}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unsupported file type for OCR. Use image or PDF.",
            )
        if ext == "pdf":
            normalized_content_type = "application/pdf"
        elif ext in {"jpg", "jpeg"}:
            normalized_content_type = "image/jpeg"
        elif ext == "png":
            normalized_content_type = "image/png"
        elif ext == "webp":
            normalized_content_type = "image/webp"
        elif ext == "heic":
            normalized_content_type = "image/heic"
        elif ext == "heif":
            normalized_content_type = "image/heif"

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Empty file payload.")
    if len(payload) > MAX_OCR_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File too large for OCR.")
    return payload, normalized_content_type
