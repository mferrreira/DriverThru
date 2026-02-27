from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from app.modules.ocr.schemas import OCRProviderName


@dataclass(slots=True)
class OCRExtractOptions:
    language: str | None = None
    prompt_hint: str | None = None


@dataclass(slots=True)
class OCRProviderResult:
    text: str
    confidence: float | None = None
    warnings: list[str] = field(default_factory=list)
    raw_payload: Any | None = None
    model: str | None = None
    duration_ms: int | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    estimated_cost_usd: float | None = None


class OCRProvider(Protocol):
    @property
    def name(self) -> OCRProviderName: ...

    def extract_text(
        self,
        payload: bytes,
        content_type: str | None,
        *,
        options: OCRExtractOptions | None = None,
    ) -> OCRProviderResult: ...
