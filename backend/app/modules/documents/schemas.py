from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

TemplateKey = Literal["affidavit", "ba208"]


class TemplateInfo(BaseModel):
    key: TemplateKey
    file_name: str


class TemplateFieldListResponse(BaseModel):
    template: TemplateInfo
    fields: list[str]


class GenerateDocumentRequest(BaseModel):
    customer_id: int
    template_key: TemplateKey
    nj_driver_license_id: int | None = None
    brazil_driver_license_id: int | None = None
    passport_id: int | None = None
    field_overrides: dict[str, str] = Field(default_factory=dict)


class GenerateDocumentResponse(BaseModel):
    template_key: TemplateKey
    bucket: str
    object_key: str
    generated_at: datetime
    matched_fields: int
    total_template_fields: int


class PrefillDocumentRequest(BaseModel):
    customer_id: int
    template_key: TemplateKey
    nj_driver_license_id: int | None = None
    brazil_driver_license_id: int | None = None
    passport_id: int | None = None


class PrefillDocumentResponse(BaseModel):
    template_key: TemplateKey
    prefilled_fields: dict[str, str] = Field(default_factory=dict)


class GeneratedDocumentItem(BaseModel):
    bucket: str
    object_key: str
    file_name: str
    customer_id: int | None = None
    template_key: TemplateKey | None = None
    generated_at: datetime | None = None
    last_modified: datetime | None = None
    size_bytes: int | None = None


class GeneratedDocumentListResponse(BaseModel):
    items: list[GeneratedDocumentItem]
    total: int
