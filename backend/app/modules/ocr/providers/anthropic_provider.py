from __future__ import annotations

import base64
import json
import logging
from time import perf_counter
from typing import Any

from app.core.config import settings
from app.modules.ocr.ports import OCRExtractOptions, OCRProvider, OCRProviderResult
from app.modules.ocr.schemas import OCRProviderName

logger = logging.getLogger(__name__)


class AnthropicOCRProvider(OCRProvider):
    @property
    def name(self) -> OCRProviderName:
        return OCRProviderName.ANTHROPIC

    def extract_text(self, payload: bytes, content_type: str | None, *, options: OCRExtractOptions | None = None,) -> OCRProviderResult:
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured.")

        try:
            from anthropic import Anthropic
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("anthropic SDK is not installed.") from exc

        media_type = (content_type or "image/jpeg").strip().lower()
        if not media_type.startswith("image/") and media_type != "application/pdf":
            raise ValueError(f"Unsupported content type for Anthropic OCR: {media_type}")

        client = Anthropic(api_key=api_key)
        prompt = (options.prompt_hint if options and options.prompt_hint else "Extract all visible text from this file.")

        started = perf_counter()
        configured_model = getattr(settings, "OCR_ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
        request_payload = {
            "max_tokens": 2048,
            "temperature": 0,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt,
                        },
                        {
                            "type": "document" if media_type == "application/pdf" else "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64.b64encode(payload).decode("ascii"),
                            },
                        },
                    ],
                }
            ],
        }
        try:
            message = _create_message_with_model_fallback(
                client=client,
                configured_model=configured_model,
                request_payload=request_payload,
            )
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(_format_anthropic_error(exc)) from exc
        duration_ms = int((perf_counter() - started) * 1000)

        text = _extract_message_text(message)
        warnings: list[str] = []
        if not text:
            warnings.append("Anthropic response did not include extracted text.")

        model = getattr(message, "model", None) or getattr(settings, "OCR_ANTHROPIC_MODEL", None)
        input_tokens, output_tokens = _extract_usage_tokens(getattr(message, "usage", None))
        estimated_cost_usd = _estimate_anthropic_cost_usd(model=model, input_tokens=input_tokens, output_tokens=output_tokens)

        return OCRProviderResult(
            text=text,
            confidence=None,
            warnings=warnings,
            raw_payload={"id": getattr(message, "id", None), "model": getattr(message, "model", None)},
            model=model,
            duration_ms=duration_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost_usd=estimated_cost_usd,
        )


def _create_message_with_model_fallback(*, client: Any, configured_model: str, request_payload: dict[str, Any]) -> Any:
    attempted: list[str] = []
    for model in _candidate_models(configured_model):
        attempted.append(model)
        try:
            return client.messages.create(model=model, **request_payload)
        except Exception as exc:  # noqa: BLE001
            if _is_model_not_found_error(exc):
                logger.warning("Anthropic model not found: %s (trying fallback)", model)
                continue
            raise
    raise RuntimeError(f"All configured/fallback Anthropic models failed: {', '.join(attempted)}")


def _candidate_models(configured_model: str) -> list[str]:
    candidates = [
        (configured_model or "").strip(),
        "claude-sonnet-4-20250514",
        "claude-3-7-sonnet-20250219",
        "claude-3-7-sonnet-latest",
    ]
    output: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        if not item or item in seen:
            continue
        seen.add(item)
        output.append(item)
    return output


def _is_model_not_found_error(exc: Exception) -> bool:
    name = exc.__class__.__name__
    if name != "NotFoundError":
        return False
    message = str(exc).lower()
    return "model" in message or "not_found_error" in message


def _format_anthropic_error(exc: Exception) -> str:
    text = str(exc).strip()
    if not text:
        return "Anthropic OCR request failed."
    if "not_found_error" in text.lower() and "model" in text.lower():
        return f"Anthropic OCR model is unavailable for this account/environment. {text}"
    return f"Anthropic OCR request failed: {text}"


def _extract_message_text(message: Any) -> str:
    parts: list[str] = []
    for item in getattr(message, "content", []) or []:
        extracted = _extract_block_text(item)
        if extracted:
            parts.append(extracted)
    return "\n".join(part.strip() for part in parts if part.strip()).strip()


def _extract_block_text(block: Any) -> str | None:
    if block is None:
        return None

    if isinstance(block, str):
        return block

    if isinstance(block, dict):
        block_type = str(block.get("type", "")).lower()
        if "text" in block and isinstance(block["text"], str):
            return block["text"]
        if block_type in {"tool_result", "input_json"} and "input" in block:
            try:
                return json.dumps(block["input"], ensure_ascii=True)
            except TypeError:
                return str(block["input"])
        if "content" in block:
            nested = block.get("content")
            if isinstance(nested, list):
                nested_parts = [_extract_block_text(item) for item in nested]
                joined = "\n".join(part for part in nested_parts if part)
                return joined or None
        return None

    item_text = getattr(block, "text", None)
    if isinstance(item_text, str):
        return item_text

    item_input = getattr(block, "input", None)
    if item_input is not None:
        try:
            return json.dumps(item_input, ensure_ascii=True)
        except TypeError:
            return str(item_input)

    nested = getattr(block, "content", None)
    if isinstance(nested, list):
        nested_parts = [_extract_block_text(item) for item in nested]
        joined = "\n".join(part for part in nested_parts if part)
        return joined or None

    return None


def _extract_usage_tokens(usage: Any) -> tuple[int | None, int | None]:
    if usage is None:
        return None, None

    def get_int(name: str) -> int:
        if isinstance(usage, dict):
            value = usage.get(name, 0)
        else:
            value = getattr(usage, name, 0)
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0

    input_tokens = get_int("input_tokens") + get_int("cache_creation_input_tokens") + get_int("cache_read_input_tokens")
    output_tokens = get_int("output_tokens")
    return (input_tokens or None), (output_tokens or None)


def _estimate_anthropic_cost_usd(
    *,
    model: str | None,
    input_tokens: int | None,
    output_tokens: int | None,
) -> float | None:
    if input_tokens is None and output_tokens is None:
        return None

    model_name = (model or "").lower()
    in_rate_per_million = 3.0
    out_rate_per_million = 15.0

    if "haiku" in model_name:
        in_rate_per_million = 0.8
        out_rate_per_million = 4.0
    elif "opus" in model_name:
        in_rate_per_million = 15.0
        out_rate_per_million = 75.0
    elif "sonnet" in model_name:
        in_rate_per_million = 3.0
        out_rate_per_million = 15.0

    estimated = ((input_tokens or 0) * in_rate_per_million + (output_tokens or 0) * out_rate_per_million) / 1_000_000
    return round(estimated, 6)
