from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class OCRProviderName(str, Enum):
    PYTESSERACT = "pytesseract"
    ANTHROPIC = "anthropic"


class OCRDocumentKind(str, Enum):
    UNKNOWN = "unknown"
    PASSPORT = "passport"
    DRIVER_LICENSE = "driver_license"
    ID_CARD = "id_card"
    BRAZIL_RG = "brazil_rg"
    BRAZIL_CNH = "brazil_cnh"
    NJ_DRIVER_LICENSE = "nj_driver_license"


class OCRPrefillTarget(str, Enum):
    NONE = "none"
    CUSTOMER = "customer"
    PASSPORT = "passport"
    BRAZIL_LICENSE = "brazil_driver_license"
    NJ_LICENSE = "nj_driver_license"

class OCRUsageMetrics(BaseModel):
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None


class OCROperationMeta(BaseModel):
    provider: OCRProviderName
    model: str | None = None
    duration_ms: int | None = None
    estimated_cost_usd: float | None = None
    usage: OCRUsageMetrics | None = None


class OCRCustomerFormFields(BaseModel):
    first_name: str | None = None
    middle_name: str | None = None
    last_name: str | None = None
    suffix: str | None = None
    phone_number: str | None = None
    email: str | None = None
    date_of_birth: str | None = None
    has_left_country: bool | None = None
    has_no_ssn: bool | None = None
    ssn_encrypted: str | None = None
    gender: str | None = None
    eye_color: str | None = None
    weight_lbs: str | None = None
    height_feet: str | None = None
    height_inches: str | None = None
    birth_place: str | None = None
    nationality: str | None = None


class OCRDocumentFormFields(BaseModel):
    document_number: str | None = None
    issue_date: str | None = None
    expiration_date: str | None = None
    issuing_country: str | None = None
    issuing_authority: str | None = None
    full_name: str | None = None
    category: str | None = None
    registry_number: str | None = None
    cpf_encrypted: str | None = None
    passport_number_encrypted: str | None = None
    license_number_encrypted: str | None = None


class OCRPassportFormFields(BaseModel):
    passport_number_encrypted: str | None = None
    document_type: str | None = None
    issuing_country: str | None = None
    surname: str | None = None
    given_name: str | None = None
    middle_name: str | None = None
    father_name: str | None = None
    mother_name: str | None = None
    nationality: str | None = None
    birth_place: str | None = None
    issue_date: str | None = None
    expiration_date: str | None = None
    issuing_authority: str | None = None
    is_current: bool | None = None


class OCRBrazilLicenseFormFields(BaseModel):
    full_name: str | None = None
    cpf_encrypted: str | None = None
    identity_number: str | None = None
    issuing_agency: str | None = None
    issuing_state: str | None = None
    father_name: str | None = None
    mother_name: str | None = None
    category: str | None = None
    registry_number: str | None = None
    expiration_date: str | None = None
    first_license_date: str | None = None
    observations: str | None = None
    issue_place: str | None = None
    issue_date: str | None = None
    paper_number: str | None = None
    issue_code: str | None = None
    is_current: bool | None = None


class OCRNJLicenseFormFields(BaseModel):
    license_number_encrypted: str | None = None
    issue_date: str | None = None
    expiration_date: str | None = None
    license_class: str | None = None
    endorsements: list[str] = Field(default_factory=list)
    restrictions: list[str] = Field(default_factory=list)
    is_current: bool | None = None


class OCRCustomerFormPrefillResponse(BaseModel):
    provider: OCRProviderName
    document_kind: OCRDocumentKind = OCRDocumentKind.UNKNOWN
    target_form: OCRPrefillTarget = OCRPrefillTarget.NONE
    apply_customer_fields: bool = False
    customer_fields: OCRCustomerFormFields = Field(default_factory=OCRCustomerFormFields)
    document_fields: OCRDocumentFormFields = Field(default_factory=OCRDocumentFormFields)
    confidence: float | None = Field(default=None, ge=0, le=1)
    raw_text: str | None = None
    warnings: list[str] = Field(default_factory=list)
    ocr_meta: OCROperationMeta | None = None


class OCRPassportFormPrefillResponse(BaseModel):
    provider: OCRProviderName
    document_kind: OCRDocumentKind = OCRDocumentKind.PASSPORT
    target_form: OCRPrefillTarget = OCRPrefillTarget.PASSPORT
    apply_customer_fields: bool = True
    customer_form: OCRCustomerFormFields = Field(default_factory=OCRCustomerFormFields)
    passport_form: OCRPassportFormFields = Field(default_factory=OCRPassportFormFields)
    confidence: float | None = Field(default=None, ge=0, le=1)
    raw_text: str | None = None
    warnings: list[str] = Field(default_factory=list)
    ocr_meta: OCROperationMeta | None = None


class OCRBrazilLicenseFormPrefillResponse(BaseModel):
    provider: OCRProviderName
    document_kind: OCRDocumentKind = OCRDocumentKind.BRAZIL_CNH
    target_form: OCRPrefillTarget = OCRPrefillTarget.BRAZIL_LICENSE
    apply_customer_fields: bool = False
    customer_form: OCRCustomerFormFields = Field(default_factory=OCRCustomerFormFields)
    brazil_form: OCRBrazilLicenseFormFields = Field(default_factory=OCRBrazilLicenseFormFields)
    confidence: float | None = Field(default=None, ge=0, le=1)
    raw_text: str | None = None
    warnings: list[str] = Field(default_factory=list)
    ocr_meta: OCROperationMeta | None = None


class OCRNJLicenseFormPrefillResponse(BaseModel):
    provider: OCRProviderName
    document_kind: OCRDocumentKind = OCRDocumentKind.NJ_DRIVER_LICENSE
    target_form: OCRPrefillTarget = OCRPrefillTarget.NJ_LICENSE
    apply_customer_fields: bool = False
    customer_form: OCRCustomerFormFields = Field(default_factory=OCRCustomerFormFields)
    nj_form: OCRNJLicenseFormFields = Field(default_factory=OCRNJLicenseFormFields)
    confidence: float | None = Field(default=None, ge=0, le=1)
    raw_text: str | None = None
    warnings: list[str] = Field(default_factory=list)
    ocr_meta: OCROperationMeta | None = None
