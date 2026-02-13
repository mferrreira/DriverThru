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
    field_overrides: dict[str, str] = Field(default_factory=dict)


class GenerateDocumentResponse(BaseModel):
    template_key: TemplateKey
    bucket: str
    object_key: str
    generated_at: datetime
    matched_fields: int
    total_template_fields: int
