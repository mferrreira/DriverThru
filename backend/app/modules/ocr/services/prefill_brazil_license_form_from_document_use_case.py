from __future__ import annotations

from typing import Any

from app.modules.ocr.ports import OCRExtractOptions, OCRProvider
from app.modules.ocr.schemas import (
    OCRBrazilLicenseFormFields,
    OCRBrazilLicenseFormPrefillResponse,
    OCRCustomerFormFields,
    OCRDocumentKind,
    OCRPrefillTarget,
)
from app.modules.ocr.services.json_utils import coerce_confidence, dedupe_strings, normalize_warnings, parse_llm_json_object
from app.modules.ocr.services.meta import build_ocr_meta
from app.modules.ocr.services.prefill_customer_form_from_document_use_case import prefill_customer_form_from_document
from app.modules.ocr.services.prompts import prefill_brazil_license_form_json_prompt


def prefill_brazil_license_form_from_document(provider: OCRProvider, payload: bytes, content_type: str | None, ) -> OCRBrazilLicenseFormPrefillResponse:
    result = provider.extract_text(
        payload,
        content_type,
        options=OCRExtractOptions(prompt_hint=prefill_brazil_license_form_json_prompt()),
    )
    parsed = parse_llm_json_object(result.text)
    ocr_meta = build_ocr_meta(provider.name, result)
    if isinstance(parsed, dict):
        response = _build_from_json(provider, parsed, result.text, result.warnings, result.confidence, ocr_meta)
        if response is not None:
            return response

    generic = prefill_customer_form_from_document(provider, payload, content_type)
    return OCRBrazilLicenseFormPrefillResponse(
        provider=generic.provider,
        document_kind=OCRDocumentKind.BRAZIL_CNH,
        target_form=OCRPrefillTarget.BRAZIL_LICENSE,
        apply_customer_fields=False,
        customer_form=OCRCustomerFormFields(),
        brazil_form=OCRBrazilLicenseFormFields(
            full_name=generic.document_fields.full_name,
            category=generic.document_fields.category,
            registry_number=generic.document_fields.registry_number,
            cpf_encrypted=generic.document_fields.cpf_encrypted,
            issue_date=generic.document_fields.issue_date,
            expiration_date=generic.document_fields.expiration_date,
            is_current=True,
        ),
        confidence=generic.confidence,
        raw_text=generic.raw_text,
        warnings=generic.warnings,
        ocr_meta=ocr_meta,
    )


def _build_from_json(
    provider: OCRProvider,
    parsed: dict[str, Any],
    raw_text: str,
    fallback_warnings: list[str],
    fallback_confidence: float | None,
    ocr_meta,
) -> OCRBrazilLicenseFormPrefillResponse | None:
    try:
        fields = OCRBrazilLicenseFormFields.model_validate(parsed.get("brazil_form") or parsed.get("brazil_license_fields") or {})
        warnings = dedupe_strings(normalize_warnings(parsed.get("warnings")) + list(fallback_warnings))
        confidence = coerce_confidence(parsed.get("confidence"), fallback_confidence)
        return OCRBrazilLicenseFormPrefillResponse(
            provider=provider.name,
            document_kind=OCRDocumentKind.BRAZIL_CNH,
            target_form=OCRPrefillTarget.BRAZIL_LICENSE,
            apply_customer_fields=False,
            customer_form=OCRCustomerFormFields(),
            brazil_form=fields,
            confidence=confidence,
            raw_text=raw_text,
            warnings=warnings,
            ocr_meta=ocr_meta,
        )
    except Exception:
        return None
