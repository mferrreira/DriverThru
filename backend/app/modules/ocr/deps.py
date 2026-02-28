from __future__ import annotations

import logging

from fastapi import HTTPException, status

from app.core.config import settings
from app.modules.ocr.ports import OCRProvider
from app.modules.ocr.providers import AnthropicOCRProvider

logger = logging.getLogger(__name__)


def get_ocr_provider() -> OCRProvider:
    provider_name = (getattr(settings, "OCR_PROVIDER", "anthropic") or "anthropic").strip().lower()
    if provider_name in {"anthropic"}:
        return AnthropicOCRProvider()
    if provider_name == "pytesseract":
        logger.warning("OCR_PROVIDER=pytesseract is no longer supported; falling back to anthropic")
        return AnthropicOCRProvider()
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Unsupported OCR_PROVIDER '{provider_name}'. Supported provider: anthropic.",
    )
