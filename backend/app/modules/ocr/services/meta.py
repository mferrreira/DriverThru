from __future__ import annotations

from app.modules.ocr.ports import OCRProviderResult
from app.modules.ocr.schemas import OCROperationMeta, OCRProviderName, OCRUsageMetrics


def build_ocr_meta(provider_name: OCRProviderName, result: OCRProviderResult) -> OCROperationMeta:
    usage = None
    if result.input_tokens is not None or result.output_tokens is not None:
        total = (result.input_tokens or 0) + (result.output_tokens or 0)
        usage = OCRUsageMetrics(
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            total_tokens=total if total > 0 else None,
        )

    return OCROperationMeta(
        provider=provider_name,
        model=result.model,
        duration_ms=result.duration_ms,
        estimated_cost_usd=result.estimated_cost_usd,
        usage=usage,
    )
