from __future__ import annotations

def prefill_customer_form_json_prompt() -> str:
    return (
        "Analyze this document image/PDF and return ONLY valid JSON (no markdown). "
        "Classify the document and extract fields for frontend form prefill. "
        "Use this exact shape: "
        '{"document_kind":"unknown|passport|driver_license|id_card|brazil_rg|brazil_cnh|nj_driver_license",'
        '"target_form":"none|customer|passport|brazil_driver_license|nj_driver_license",'
        '"apply_customer_fields":true,'
        '"customer_fields":{"first_name":null,"middle_name":null,"last_name":null,"date_of_birth":null,"gender":null,"birth_place":null,"nationality":null},'
        '"document_fields":{"document_number":null,"issue_date":null,"expiration_date":null,"issuing_country":null,"issuing_authority":null,"full_name":null,"category":null,"registry_number":null,"cpf_encrypted":null,"passport_number_encrypted":null,"license_number_encrypted":null},'
        '"confidence":null,'
        '"warnings":[]}'
        " IMPORTANT: If document is a driver license/CNH/NJ license, set apply_customer_fields=false."
        " Dates should be strings in YYYY-MM-DD when possible, otherwise preserve visible format."
    )


def extract_passport_mrz_only_prompt() -> str:
    return (
        "Extract ONLY the passport MRZ from this image/PDF. "
        "Return plain text with exactly two lines when possible, without markdown or explanations. "
        "Keep all '<' characters and original MRZ order."
    )


def prefill_brazil_license_form_json_prompt() -> str:
    return (
        "Analyze this Brazilian CNH (driver license) image/PDF and return ONLY valid JSON (no markdown). "
        "Extract CNH fields for frontend form prefill. Do not return customer fields. "
        "Use this exact shape: "
        '{"brazil_form":{"full_name":null,"identity_number":null,"issuing_agency":null,"issuing_state":null,"cpf_encrypted":null,"father_name":null,"mother_name":null,"category":null,"registry_number":null,"expiration_date":null,"first_license_date":null,"observations":null,"issue_place":null,"issue_date":null,"paper_number":null,"issue_code":null,"is_current":null},'
        '"confidence":null,"warnings":[]}'
        " Prefer YYYY-MM-DD for dates when possible."
    )


def prefill_nj_license_form_json_prompt() -> str:
    return (
        "Analyze this New Jersey driver license image/PDF and return ONLY valid JSON (no markdown). "
        "Extract NJ license fields for frontend form prefill. Do not return customer fields. "
        "Use this exact shape: "
        '{"nj_form":{"license_number_encrypted":null,"issue_date":null,"expiration_date":null,"license_class":null,"endorsements":[],"restrictions":[],"is_current":null},'
        '"confidence":null,"warnings":[]}'
        " Prefer YYYY-MM-DD for dates when possible."
    )
