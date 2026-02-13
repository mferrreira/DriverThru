from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import black
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.deps.minio.minio_client import get_minio_client
from app.modules.customers.models import AddressType, Customer
from app.modules.documents.schemas import GenerateDocumentResponse, TemplateInfo, TemplateKey

TEMPLATE_FILES: dict[TemplateKey, str] = {
    "affidavit": "affidavit.pdf",
    "ba208": "BA-208.pdf",
}

AFFIDAVIT_OVERLAY_FIELDS = [
    "full_name",
    "date_of_birth",
    "applicant_signature",
    "applicant_date",
    "county",
    "appeared_name",
]

# (value key, anchor text, x offset, y offset, font size)
AFFIDAVIT_ANCHOR_RULES: list[tuple[str, str, float, float, int]] = [
    ("full_name", "I,", 26.0, 0.0, 11),
    ("date_of_birth", "born on", 54.0, 0.0, 11),
    ("applicant_signature", "Applicant signature", 0.0, -12.0, 11),
    ("applicant_date", "Date", 0.0, -12.0, 11),
    ("county", "COUNTY OF", 90.0, 0.0, 11),
    ("appeared_name", "before me personally appeared", 210.0, 0.0, 11),
]


class TemplateNotFoundError(ValueError):
    pass


class CustomerNotFoundError(ValueError):
    pass


def list_templates() -> list[TemplateInfo]:
    return [TemplateInfo(key=key, file_name=file_name) for key, file_name in TEMPLATE_FILES.items()]


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


def generate_document(
    db: Session,
    customer_id: int,
    template_key: TemplateKey,
    field_overrides: dict[str, str] | None = None,
) -> GenerateDocumentResponse:
    customer = _get_customer(db, customer_id)
    if customer is None:
        raise CustomerNotFoundError(f"Customer {customer_id} not found")

    template_path = get_template_path(template_key)
    reader = PdfReader(str(template_path))
    writer = PdfWriter()

    template_fields = reader.get_fields() or {}
    values = _build_pdf_value_map(customer)
    if field_overrides:
        values.update(field_overrides)

    normalized = {_normalize_key(k): str(v) for k, v in values.items() if v is not None}
    resolved: dict[str, str] = {}
    matched_fields = 0
    total_template_fields = len(template_fields)
    for field_name in template_fields.keys():
        field_key = _normalize_key(field_name)
        if field_key in normalized:
            resolved[field_name] = normalized[field_key]

    if template_fields:
        writer.append_pages_from_reader(reader)
        writer.set_need_appearances_writer(True)
        for page in writer.pages:
            writer.update_page_form_field_values(page, resolved, auto_regenerate=False)
        matched_fields = len(resolved)
    elif template_key == "affidavit":
        matched_fields = _render_affidavit_overlay(reader=reader, writer=writer, values=values)
        total_template_fields = len(AFFIDAVIT_OVERLAY_FIELDS)
    else:
        writer.append_pages_from_reader(reader)

    pdf_bytes = BytesIO()
    writer.write(pdf_bytes)
    payload = pdf_bytes.getvalue()

    now = datetime.now(UTC)
    object_key = (
        f"{settings.GENERATED_DOCUMENTS_PREFIX}/"
        f"{customer.id}/"
        f"{template_key}_{now.strftime('%Y%m%d_%H%M%S')}.pdf"
    )
    client = get_minio_client()
    client.put_object(
        bucket_name=settings.MINIO_BUCKET,
        object_name=object_key,
        data=BytesIO(payload),
        length=len(payload),
        content_type="application/pdf",
    )

    return GenerateDocumentResponse(
        template_key=template_key,
        bucket=settings.MINIO_BUCKET,
        object_key=object_key,
        generated_at=now,
        matched_fields=matched_fields,
        total_template_fields=total_template_fields,
    )


def _get_customer(db: Session, customer_id: int) -> Customer | None:
    stmt = (
        select(Customer)
        .where(Customer.id == customer_id, Customer.active.is_(True))
        .options(
            selectinload(Customer.addresses),
            selectinload(Customer.nj_driver_licenses),
            selectinload(Customer.brazil_driver_licenses),
            selectinload(Customer.passports),
        )
    )
    return db.scalar(stmt)


def _build_pdf_value_map(customer: Customer) -> dict[str, str]:
    result: dict[str, str] = {}

    def put(key: str, value: object | None) -> None:
        if value is None:
            return
        result[key] = str(value)

    put("customer_id", customer.id)
    put("first_name", customer.first_name)
    put("middle_name", customer.middle_name)
    put("last_name", customer.last_name)
    put("full_name", " ".join([p for p in [customer.first_name, customer.middle_name, customer.last_name] if p]))
    put("applicant_signature", result.get("full_name"))
    put("appeared_name", result.get("full_name"))
    put("suffix", customer.suffix)
    put("phone_number", customer.phone_number)
    put("email", customer.email)
    put("date_of_birth", customer.date_of_birth.strftime("%m/%d/%Y"))
    put("applicant_date", datetime.now(UTC).strftime("%m/%d/%Y"))
    put("gender", customer.gender.value if customer.gender else None)
    put("eye_color", customer.eye_color)
    put("weight_lbs", customer.weight_lbs)
    put("height_feet", customer.height_feet)
    put("height_inches", customer.height_inches)
    put("height_ft_in", _format_height(customer.height_feet, customer.height_inches))

    addresses_by_type = {address.address_type: address for address in customer.addresses if address.active}
    _put_address(result, "residential", addresses_by_type.get(AddressType.RESIDENTIAL))
    _put_address(result, "mailing", addresses_by_type.get(AddressType.MAILING))
    _put_address(result, "out_of_state", addresses_by_type.get(AddressType.OUT_OF_STATE))
    residential = addresses_by_type.get(AddressType.RESIDENTIAL)
    if residential:
        put("county", residential.county)

    current_nj = _pick_current(customer.nj_driver_licenses)
    if current_nj:
        put("nj_driver_license", current_nj.license_number_encrypted)
        put("nj_dl_issue_date", _fmt_date(current_nj.issue_date))
        put("nj_dl_expiration_date", _fmt_date(current_nj.expiration_date))
        put("nj_dl_class", current_nj.license_class.value if current_nj.license_class else None)
        put("nj_dl_endorsements", ",".join(sorted([item.code.value for item in current_nj.endorsements])))
        put("nj_dl_restrictions", ",".join(sorted([item.code.value for item in current_nj.restrictions])))

    current_br = _pick_current(customer.brazil_driver_licenses)
    if current_br:
        put("br_full_name", current_br.full_name)
        put("br_identity_number", current_br.identity_number)
        put("br_issuing_agency", current_br.issuing_agency)
        put("br_issuing_state", current_br.issuing_state)
        put("br_cpf", current_br.cpf_encrypted)
        put("br_father_name", current_br.father_name)
        put("br_mother_name", current_br.mother_name)
        put("br_category", current_br.category)
        put("br_registry_number", current_br.registry_number)
        put("br_expiration_date", _fmt_date(current_br.expiration_date))
        put("br_first_license_date", _fmt_date(current_br.first_license_date))
        put("br_observations", current_br.observations)
        put("br_issue_place", current_br.issue_place)
        put("br_issue_date", _fmt_date(current_br.issue_date))
        put("br_paper_number", current_br.paper_number)
        put("br_issue_code", current_br.issue_code)

    current_passport = _pick_current(customer.passports)
    if current_passport:
        put("passport_type", current_passport.document_type)
        put("passport_issuing_country", current_passport.issuing_country)
        put("passport_number", current_passport.passport_number_encrypted)
        put("passport_surname", current_passport.surname)
        put("passport_given_name", current_passport.given_name)
        put("passport_middle_name", current_passport.middle_name)
        put("passport_father_name", current_passport.father_name)
        put("passport_mother_name", current_passport.mother_name)
        put("passport_nationality", current_passport.nationality)
        put("passport_birth_place", current_passport.birth_place)
        put("passport_issue_date", _fmt_date(current_passport.issue_date))
        put("passport_expiration_date", _fmt_date(current_passport.expiration_date))
        put("passport_issuing_authority", current_passport.issuing_authority)

    return _with_aliases(result)


def _put_address(target: dict[str, str], prefix: str, address: object | None) -> None:
    if not address:
        return
    target[f"{prefix}_street"] = str(address.street)
    target[f"{prefix}_apt"] = str(address.apt or "")
    target[f"{prefix}_city"] = str(address.city)
    target[f"{prefix}_state"] = str(address.state)
    target[f"{prefix}_zip_code"] = str(address.zip_code)
    target[f"{prefix}_county"] = str(address.county or "")
    target[f"{prefix}_full_address"] = ", ".join(
        [part for part in [address.street, address.apt, address.city, address.state, address.zip_code] if part]
    )


def _with_aliases(data: dict[str, str]) -> dict[str, str]:
    expanded = dict(data)
    for key, value in list(data.items()):
        expanded[key.replace("_", " ")] = value
        expanded[key.replace("_", "")] = value
        expanded[key.upper()] = value
    return expanded


def _pick_current(items: list[object]) -> object | None:
    if not items:
        return None
    current = [item for item in items if getattr(item, "active", False) and getattr(item, "is_current", False)]
    if current:
        return current[0]
    active = [item for item in items if getattr(item, "active", False)]
    return active[0] if active else None


def _normalize_key(value: str) -> str:
    return "".join(char for char in value.lower() if char.isalnum())


def _fmt_date(value: object | None) -> str | None:
    if value is None:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%m/%d/%Y")
    return str(value)


def _format_height(feet: int | None, inches: int | None) -> str | None:
    if feet is None and inches is None:
        return None
    feet_value = feet or 0
    inches_value = inches or 0
    return f"{feet_value}'{inches_value}\""


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
