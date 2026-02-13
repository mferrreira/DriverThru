from __future__ import annotations

from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import black
from reportlab.pdfgen import canvas

from app.core.config import settings
from app.modules.documents.constants import (
    AFFIDAVIT_ANCHOR_RULES,
    AFFIDAVIT_OVERLAY_FIELDS,
    TEMPLATE_FILES,
)
from app.modules.documents.errors import TemplateNotFoundError
from app.modules.documents.schemas import TemplateKey


def get_template_path(template_key: TemplateKey) -> Path:
    if template_key not in TEMPLATE_FILES:
        raise TemplateNotFoundError(f"Unsupported template: {template_key}")

    documents_dir = Path(settings.DOCUMENTS_DIR)
    template_path = documents_dir / TEMPLATE_FILES[template_key]
    if not template_path.exists():
        raise TemplateNotFoundError(f"Template file not found: {template_path}")
    return template_path


def list_template_fields(template_key: TemplateKey) -> list[str]:
    template_path = get_template_path(template_key)
    reader = PdfReader(str(template_path))
    fields = reader.get_fields() or {}
    if fields:
        return sorted(fields.keys())
    if template_key == "affidavit":
        return AFFIDAVIT_OVERLAY_FIELDS
    return []


def render_template_pdf(template_key: TemplateKey, values: dict[str, str]) -> tuple[bytes, int, int]:
    template_path = get_template_path(template_key)
    reader = PdfReader(str(template_path))
    writer = PdfWriter()

    template_fields = reader.get_fields() or {}
    resolved = resolve_fields_for_template(template_key=template_key, values=values, template_fields=template_fields)
    matched_fields = 0
    total_template_fields = len(template_fields)

    if template_fields:
        writer.clone_document_from_reader(reader)
        writer.set_need_appearances_writer(False)
        for page in writer.pages:
            writer.update_page_form_field_values(page, resolved, auto_regenerate=True)
        matched_fields = len(resolved)
    elif template_key == "affidavit":
        matched_fields = _render_affidavit_overlay(reader=reader, writer=writer, values=values)
        total_template_fields = len(AFFIDAVIT_OVERLAY_FIELDS)
    else:
        writer.append_pages_from_reader(reader)

    pdf_bytes = BytesIO()
    writer.write(pdf_bytes)
    return pdf_bytes.getvalue(), matched_fields, total_template_fields


def resolve_fields_for_template(
    template_key: TemplateKey,
    values: dict[str, str],
    template_fields: dict | None = None,
) -> dict[str, str]:
    if template_fields is None:
        template_path = get_template_path(template_key)
        reader = PdfReader(str(template_path))
        template_fields = reader.get_fields() or {}

    normalized = {_normalize_key(k): str(v) for k, v in values.items() if v is not None}
    resolved: dict[str, str] = {}
    if template_fields:
        for field_name in template_fields.keys():
            field_key = _normalize_key(field_name)
            if field_key in normalized:
                resolved[field_name] = normalized[field_key]
    elif template_key == "affidavit":
        for field_name in AFFIDAVIT_OVERLAY_FIELDS:
            value = values.get(field_name)
            if value:
                resolved[field_name] = str(value)
    return resolved


def _normalize_key(value: str) -> str:
    return "".join(char for char in value.lower() if char.isalnum())


def _render_affidavit_overlay(reader: PdfReader, writer: PdfWriter, values: dict[str, str]) -> int:
    if not reader.pages:
        return 0

    first_page = reader.pages[0]
    width = float(first_page.mediabox.width)
    height = float(first_page.mediabox.height)

    anchor_positions = _extract_anchor_positions(first_page)
    overlay_buffer = BytesIO()
    pdf_canvas = canvas.Canvas(overlay_buffer, pagesize=(width, height))
    pdf_canvas.setFillColor(black)

    matched = 0
    for value_key, anchor_text, dx, dy, font_size in AFFIDAVIT_ANCHOR_RULES:
        anchor_key = _normalize_space(anchor_text)
        pos = anchor_positions.get(anchor_key)
        value = values.get(value_key)
        if not pos or not value:
            continue
        x, y = pos
        pdf_canvas.setFont("Helvetica", font_size)
        pdf_canvas.drawString(x + dx, y + dy, str(value))
        matched += 1

    pdf_canvas.save()
    overlay_buffer.seek(0)

    overlay_reader = PdfReader(overlay_buffer)
    merged_first_page = reader.pages[0]
    merged_first_page.merge_page(overlay_reader.pages[0])
    writer.add_page(merged_first_page)
    for page in reader.pages[1:]:
        writer.add_page(page)
    return matched


def _extract_anchor_positions(page: object) -> dict[str, tuple[float, float]]:
    positions: dict[str, tuple[float, float]] = {}

    def visitor_text(text: str, cm: list[float], tm: list[float], font_dict: dict, font_size: float) -> None:
        label = _normalize_space(text)
        if not label or label in positions:
            return
        positions[label] = (float(tm[4]), float(tm[5]))

    page.extract_text(visitor_text=visitor_text)
    return positions


def _normalize_space(value: str) -> str:
    return " ".join((value or "").split()).strip().lower()
