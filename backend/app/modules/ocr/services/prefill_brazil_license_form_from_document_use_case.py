from __future__ import annotations

import re
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
    inferred_customer = _infer_customer_from_brazil_license_text(result.text)
    if generic.document_fields.full_name:
        first_name, middle_name, last_name, suffix = _split_name_with_suffix(generic.document_fields.full_name)
        inferred_customer.first_name = inferred_customer.first_name or first_name
        inferred_customer.middle_name = inferred_customer.middle_name or middle_name
        inferred_customer.last_name = inferred_customer.last_name or last_name
        inferred_customer.suffix = inferred_customer.suffix or suffix
    return OCRBrazilLicenseFormPrefillResponse(
        provider=generic.provider,
        document_kind=OCRDocumentKind.BRAZIL_CNH,
        target_form=OCRPrefillTarget.BRAZIL_LICENSE,
        apply_customer_fields=_has_customer_data(inferred_customer),
        customer_form=inferred_customer if _has_customer_data(inferred_customer) else OCRCustomerFormFields(),
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
        customer_form = OCRCustomerFormFields.model_validate(parsed.get("customer_form") or parsed.get("customer_fields") or {})
        if fields.full_name:
            first_name, middle_name, last_name, suffix = _split_name_with_suffix(fields.full_name)
            customer_form.first_name = customer_form.first_name or first_name
            customer_form.middle_name = customer_form.middle_name or middle_name
            customer_form.last_name = customer_form.last_name or last_name
            customer_form.suffix = customer_form.suffix or suffix
        apply_customer_fields = bool(parsed.get("apply_customer_fields", False)) or _has_customer_data(customer_form)
        warnings = dedupe_strings(normalize_warnings(parsed.get("warnings")) + list(fallback_warnings))
        confidence = coerce_confidence(parsed.get("confidence"), fallback_confidence)
        return OCRBrazilLicenseFormPrefillResponse(
            provider=provider.name,
            document_kind=OCRDocumentKind.BRAZIL_CNH,
            target_form=OCRPrefillTarget.BRAZIL_LICENSE,
            apply_customer_fields=apply_customer_fields,
            customer_form=customer_form if apply_customer_fields else OCRCustomerFormFields(),
            brazil_form=fields,
            confidence=confidence,
            raw_text=raw_text,
            warnings=warnings,
            ocr_meta=ocr_meta,
        )
    except Exception:
        return None


def _has_customer_data(fields: OCRCustomerFormFields) -> bool:
    return any(
        [
            fields.first_name,
            fields.middle_name,
            fields.last_name,
            fields.suffix,
            fields.date_of_birth,
            fields.gender,
            fields.eye_color,
            fields.nationality,
            fields.birth_place,
        ]
    )


def _infer_customer_from_brazil_license_text(text: str) -> OCRCustomerFormFields:
    upper = (text or "").upper()
    return OCRCustomerFormFields(
        date_of_birth=_extract_date(upper, labels=["DATA NASC", "NASCIMENTO", "DOB"]),
        eye_color=_extract_eye_color(upper),
    )


def _extract_date(text: str, *, labels: list[str]) -> str | None:
    for label in labels:
        pattern = rf"{label}\s*[:\-]?\s*(\d{{2}}[/-]\d{{2}}[/-]\d{{4}}|\d{{4}}[/-]\d{{2}}[/-]\d{{2}})"
        match = re.search(pattern, text)
        if not match:
            continue
        value = match.group(1).replace("/", "-")
        if re.fullmatch(r"\d{2}-\d{2}-\d{4}", value):
            day, month, year = value.split("-")
            return f"{year}-{month}-{day}"
        return value
    return None


def _extract_eye_color(text: str) -> str | None:
    match = re.search(r"(?:EYES?|EYE\s*COLOR|OLHOS?)\s*[:\-]?\s*([A-Z]{3})", text)
    if not match:
        return None
    code = match.group(1)
    if code in {"BLK", "BLU", "BRN", "GRN", "GRY", "HAZ", "MAR", "MUL", "XXX"}:
        return code
    return None


def _split_name_with_suffix(value: str) -> tuple[str | None, str | None, str | None, str | None]:
    parts = [token for token in value.strip().split() if token]
    if not parts:
        return None, None, None, None
    suffix = None
    if parts[-1].upper().rstrip(".") in {"JR", "SR", "II", "III", "IV", "V"}:
        suffix = parts.pop().upper().rstrip(".")
    if len(parts) == 1:
        return parts[0], None, None, suffix
    if len(parts) == 2:
        return parts[0], None, parts[1], suffix
    return parts[0], " ".join(parts[1:-1]), parts[-1], suffix
