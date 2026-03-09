from __future__ import annotations

from datetime import date

from app.modules.ocr.ports import OCRExtractOptions, OCRProvider
from app.modules.ocr.schemas import (
    OCRCustomerFormFields,
    OCRDocumentKind,
    OCRPassportFormFields,
    OCRPassportFormPrefillResponse,
    OCRPrefillTarget,
)
from app.modules.ocr.services.meta import build_ocr_meta
from app.modules.ocr.services.passport_mrz_parser import (
    extract_td3_mrz_lines,
    parse_passport_mrz,
    validate_td3_mrz_lines,
)
from app.modules.ocr.services.prefill_customer_form_from_document_use_case import prefill_customer_form_from_document
from app.modules.ocr.services.prompts import extract_passport_mrz_only_prompt


def prefill_passport_form_from_document(
    provider: OCRProvider,
    payload: bytes,
    content_type: str | None,
) -> OCRPassportFormPrefillResponse:
    result = provider.extract_text(
        payload,
        content_type,
        options=OCRExtractOptions(prompt_hint=extract_passport_mrz_only_prompt()),
    )
    ocr_meta = build_ocr_meta(provider.name, result)

    warnings = list(result.warnings)
    mrz_lines = extract_td3_mrz_lines(result.text)
    parsed = None

    if not mrz_lines:
        warnings.append("Could not detect two MRZ lines in OCR output.")
    else:
        mrz_problems = validate_td3_mrz_lines(mrz_lines)
        warnings.extend(mrz_problems)
        fatal_mrz_problems = [problem for problem in mrz_problems if "check digit" not in problem.lower()]
        if fatal_mrz_problems:
            warnings.append("Skipping passport parsing because MRZ validation failed.")
        else:
            if mrz_problems:
                warnings.append("MRZ has check digit inconsistencies; attempting guarded parsing.")
            parsed = parse_passport_mrz(mrz_lines)

    if parsed is None:
        warnings.append("Could not parse passport MRZ content.")

    customer_form = OCRCustomerFormFields()
    passport_form = OCRPassportFormFields()

    if parsed is not None:
        first_name, middle_name = _split_given_names(parsed.given_names)
        customer_form = OCRCustomerFormFields(
            first_name=first_name,
            middle_name=middle_name,
            last_name=parsed.surname,
            date_of_birth=parsed.birth_date,
            gender=_map_gender(parsed.sex),
            nationality=parsed.nationality,
        )
        passport_form = OCRPassportFormFields(
            passport_number_encrypted=parsed.passport_number,
            document_type=parsed.document_type,
            issuing_country=parsed.issuing_country,
            surname=parsed.surname,
            given_name=first_name,
            middle_name=middle_name,
            nationality=parsed.nationality,
            issue_date=None,
            expiration_date=parsed.expiration_date,
            issuing_authority=None,
            is_current=_is_current(parsed.expiration_date),
        )
    else:
        generic = prefill_customer_form_from_document(provider=provider, payload=payload, content_type=content_type)
        if _generic_passport_fallback_has_data(generic.customer_fields, generic.document_fields):
            warnings.append("Used generic OCR fallback because passport MRZ extraction failed.")
            warnings.extend([item for item in generic.warnings if item not in warnings])
            customer_form = OCRCustomerFormFields(
                first_name=generic.customer_fields.first_name,
                middle_name=generic.customer_fields.middle_name,
                last_name=generic.customer_fields.last_name,
                date_of_birth=generic.customer_fields.date_of_birth,
                gender=generic.customer_fields.gender,
                nationality=generic.customer_fields.nationality,
            )
            passport_form = OCRPassportFormFields(
                passport_number_encrypted=generic.document_fields.passport_number_encrypted
                or generic.document_fields.document_number,
                document_type=None,
                issuing_country=generic.document_fields.issuing_country,
                surname=generic.customer_fields.last_name,
                given_name=generic.customer_fields.first_name,
                middle_name=generic.customer_fields.middle_name,
                nationality=generic.customer_fields.nationality,
                issue_date=generic.document_fields.issue_date,
                expiration_date=generic.document_fields.expiration_date,
                issuing_authority=generic.document_fields.issuing_authority,
                is_current=_is_current(generic.document_fields.expiration_date),
            )

    return OCRPassportFormPrefillResponse(
        provider=provider.name,
        document_kind=OCRDocumentKind.PASSPORT,
        target_form=OCRPrefillTarget.PASSPORT,
        apply_customer_fields=True,
        customer_form=customer_form,
        passport_form=passport_form,
        confidence=result.confidence,
        raw_text=result.text,
        warnings=warnings,
        ocr_meta=ocr_meta,
    )


def _split_given_names(raw: str | None) -> tuple[str | None, str | None]:
    if not raw:
        return None, None
    parts = [chunk for chunk in raw.strip().split() if chunk]
    if not parts:
        return None, None
    first = parts[0]
    middle = " ".join(parts[1:]) if len(parts) > 1 else None
    return first, middle


def _map_gender(value: str | None) -> str | None:
    if value == "M":
        return "male"
    if value == "F":
        return "female"
    return None


def _is_current(expiration_date: str | None) -> bool | None:
    if not expiration_date:
        return None
    try:
        expiry = date.fromisoformat(expiration_date)
    except ValueError:
        return None
    return expiry >= date.today()


def _generic_passport_fallback_has_data(
    customer_form: OCRCustomerFormFields,
    document_form: OCRPassportFormFields | object,
) -> bool:
    document_number = getattr(document_form, "passport_number_encrypted", None) or getattr(document_form, "document_number", None)
    return any(
        [
            customer_form.first_name,
            customer_form.last_name,
            customer_form.date_of_birth,
            customer_form.nationality,
            document_number,
            getattr(document_form, "expiration_date", None),
        ]
    )
