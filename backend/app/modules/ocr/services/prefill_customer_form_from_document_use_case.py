from __future__ import annotations

import re
from typing import Any

from app.modules.ocr.ports import OCRExtractOptions, OCRProvider
from app.modules.ocr.schemas import (
    OCRCustomerFormFields,
    OCRCustomerFormPrefillResponse,
    OCRDocumentFormFields,
    OCRDocumentKind,
    OCRPrefillTarget,
)
from app.modules.ocr.services.json_utils import coerce_confidence, dedupe_strings, normalize_warnings, parse_llm_json_object
from app.modules.ocr.services.meta import build_ocr_meta
from app.modules.ocr.services.prompts import prefill_customer_form_json_prompt


def prefill_customer_form_from_document(
    provider: OCRProvider,
    payload: bytes,
    content_type: str | None,
) -> OCRCustomerFormPrefillResponse:
    result = provider.extract_text(
        payload,
        content_type,
        options=OCRExtractOptions(
            prompt_hint=prefill_customer_form_json_prompt(),
        ),
    )

    parsed = parse_llm_json_object(result.text)
    ocr_meta = build_ocr_meta(provider.name, result)
    if parsed is not None:
        response = _build_response_from_json(
            provider_name=provider.name,
            ocr_meta=ocr_meta,
            parsed=parsed,
            fallback_raw_text=result.text,
            fallback_warnings=result.warnings,
            fallback_confidence=result.confidence,
        )
        if response is not None:
            return response

    return _heuristic_prefill(
        provider=provider,
        raw_text=result.text,
        warnings=result.warnings,
        confidence=result.confidence,
        ocr_meta=ocr_meta,
    )


def _build_response_from_json(
    *,
    provider_name,
    ocr_meta,
    parsed: dict[str, Any],
    fallback_raw_text: str,
    fallback_warnings: list[str],
    fallback_confidence: float | None,
) -> OCRCustomerFormPrefillResponse | None:
    try:
        kind = _safe_enum(OCRDocumentKind, parsed.get("document_kind"), OCRDocumentKind.UNKNOWN)
        target = _safe_enum(OCRPrefillTarget, parsed.get("target_form"), OCRPrefillTarget.NONE)
        apply_customer_fields = bool(parsed.get("apply_customer_fields", False))

        if kind in {
            OCRDocumentKind.DRIVER_LICENSE,
            OCRDocumentKind.BRAZIL_CNH,
            OCRDocumentKind.NJ_DRIVER_LICENSE,
        }:
            apply_customer_fields = False

        customer_fields = OCRCustomerFormFields.model_validate(parsed.get("customer_fields") or {})
        if not apply_customer_fields:
            customer_fields = OCRCustomerFormFields()

        document_fields = OCRDocumentFormFields.model_validate(parsed.get("document_fields") or {})

        warnings = normalize_warnings(parsed.get("warnings")) + list(fallback_warnings)
        confidence = coerce_confidence(parsed.get("confidence"), fallback_confidence)

        return OCRCustomerFormPrefillResponse(
            provider=provider_name,
            document_kind=kind,
            target_form=target,
            apply_customer_fields=apply_customer_fields,
            customer_fields=customer_fields,
            document_fields=document_fields,
            confidence=confidence,
            raw_text=fallback_raw_text,
            warnings=dedupe_strings(warnings),
            ocr_meta=ocr_meta,
        )
    except Exception:
        return None


def _heuristic_prefill(
    *,
    provider: OCRProvider,
    raw_text: str,
    warnings: list[str],
    confidence: float | None,
    ocr_meta,
) -> OCRCustomerFormPrefillResponse:
    text = (raw_text or "").strip()
    upper = text.upper()

    kind = OCRDocumentKind.UNKNOWN
    target = OCRPrefillTarget.NONE
    apply_customer_fields = False

    if any(token in upper for token in ["CARTEIRA NACIONAL DE HABILITACAO", "CNH", "REGISTRO", "CATEGORIA"]):
        kind = OCRDocumentKind.BRAZIL_CNH
        target = OCRPrefillTarget.BRAZIL_LICENSE
    elif "NEW JERSEY" in upper and "DRIVER" in upper and "LICENSE" in upper:
        kind = OCRDocumentKind.NJ_DRIVER_LICENSE
        target = OCRPrefillTarget.NJ_LICENSE
    elif "DRIVER" in upper and "LICENSE" in upper:
        kind = OCRDocumentKind.DRIVER_LICENSE
        target = OCRPrefillTarget.NJ_LICENSE
    elif any(token in upper for token in ["REGISTRO GERAL", "IDENTIDADE", "REPUBLICA FEDERATIVA DO BRASIL"]):
        kind = OCRDocumentKind.BRAZIL_RG
        target = OCRPrefillTarget.CUSTOMER
        apply_customer_fields = True
    elif "PASSPORT" in upper or "P<" in upper:
        kind = OCRDocumentKind.PASSPORT
        target = OCRPrefillTarget.PASSPORT
        apply_customer_fields = True
    elif any(token in upper for token in ["ID CARD", "IDENTIFICATION", "IDENTITY CARD"]):
        kind = OCRDocumentKind.ID_CARD
        target = OCRPrefillTarget.CUSTOMER
        apply_customer_fields = True

    customer_fields = OCRCustomerFormFields()
    document_fields = OCRDocumentFormFields()

    date_match = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})\b", text)
    if date_match and apply_customer_fields:
        customer_fields.date_of_birth = _normalize_date_str(date_match.group(1))

    if kind == OCRDocumentKind.PASSPORT:
        mrz_line = _first_matching_line(text, r"^[A-Z0-9<]{20,}$")
        if mrz_line:
            document_fields.document_number = _extract_passport_number_from_mrz(mrz_line) or document_fields.document_number

    name_line = _guess_name_line(text)
    if name_line and apply_customer_fields:
        first, middle, last = _split_name(name_line)
        customer_fields.first_name = first
        customer_fields.middle_name = middle
        customer_fields.last_name = last

    if kind in {OCRDocumentKind.BRAZIL_CNH, OCRDocumentKind.NJ_DRIVER_LICENSE, OCRDocumentKind.DRIVER_LICENSE}:
        apply_customer_fields = False
        customer_fields = OCRCustomerFormFields()

    return OCRCustomerFormPrefillResponse(
        provider=provider.name,
        document_kind=kind,
        target_form=target,
        apply_customer_fields=apply_customer_fields,
        customer_fields=customer_fields,
        document_fields=document_fields,
        confidence=confidence,
        raw_text=text,
        warnings=warnings,
        ocr_meta=ocr_meta,
    )


def _safe_enum(enum_cls, value: Any, default):
    if isinstance(value, enum_cls):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        for member in enum_cls:
            if member.value == normalized:
                return member
    return default
def _normalize_date_str(value: str) -> str:
    raw = value.strip()
    if re.match(r"^\d{4}[/-]\d{2}[/-]\d{2}$", raw):
        return raw.replace("/", "-")
    if re.match(r"^\d{2}[/-]\d{2}[/-]\d{4}$", raw):
        a, b, c = re.split(r"[/-]", raw)
        return f"{a}-{b}-{c}"
    return raw


def _first_matching_line(text: str, pattern: str) -> str | None:
    regex = re.compile(pattern)
    for line in text.splitlines():
        candidate = line.strip().replace(" ", "")
        if regex.match(candidate):
            return candidate
    return None


def _extract_passport_number_from_mrz(mrz_line: str) -> str | None:
    match = re.search(r"[A-Z0-9]{6,9}", mrz_line)
    return match.group(0) if match else None


def _guess_name_line(text: str) -> str | None:
    for line in text.splitlines():
        candidate = " ".join(line.strip().split())
        if len(candidate) < 5:
            continue
        if re.search(r"\d", candidate):
            continue
        words = candidate.split(" ")
        if len(words) < 2:
            continue
        alpha_ratio = sum(ch.isalpha() or ch.isspace() for ch in candidate) / max(1, len(candidate))
        if alpha_ratio >= 0.8:
            return candidate
    return None


def _split_name(name_line: str) -> tuple[str | None, str | None, str | None]:
    parts = [p for p in name_line.strip().split() if p]
    if len(parts) == 0:
        return None, None, None
    if len(parts) == 1:
        return parts[0], None, None
    if len(parts) == 2:
        return parts[0], None, parts[1]
    return parts[0], " ".join(parts[1:-1]), parts[-1]
