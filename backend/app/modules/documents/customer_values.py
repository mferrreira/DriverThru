from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.customers.models import AddressType, Customer
from app.modules.documents.constants import BA208_FIELD_ALIASES
from app.modules.documents.errors import InvalidSelectionError


def get_active_customer(db: Session, customer_id: int) -> Customer | None:
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


def build_pdf_value_map(
    customer: Customer,
    nj_driver_license_id: int | None = None,
    brazil_driver_license_id: int | None = None,
    passport_id: int | None = None,
) -> dict[str, str]:
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
    put("dob_month", customer.date_of_birth.strftime("%m"))
    put("dob_day", customer.date_of_birth.strftime("%d"))
    put("dob_year", customer.date_of_birth.strftime("%Y"))
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

    current_nj = _pick_selected_or_current(customer.nj_driver_licenses, selected_id=nj_driver_license_id, item_label="NJ license")
    if current_nj:
        put("nj_driver_license", current_nj.license_number_encrypted)
        put("nj_dl_issue_date", _fmt_date(current_nj.issue_date))
        put("nj_dl_expiration_date", _fmt_date(current_nj.expiration_date))
        put("nj_dl_class", current_nj.license_class.value if current_nj.license_class else None)
        put("nj_dl_endorsements", ",".join(sorted([item.code.value for item in current_nj.endorsements])))
        put("nj_dl_restrictions", ",".join(sorted([item.code.value for item in current_nj.restrictions])))

    current_br = _pick_selected_or_current(customer.brazil_driver_licenses, selected_id=brazil_driver_license_id, item_label="Brazil license")
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

    current_passport = _pick_selected_or_current(customer.passports, selected_id=passport_id, item_label="Passport")
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

    put("nj_driver_license_number", current_nj.license_number_encrypted if current_nj else None)
    put("social_security_number_or_itin", customer.ssn_encrypted)
    put("signature_date", datetime.now(UTC).strftime("%m/%d/%Y"))
    put("weight", customer.weight_lbs)
    put("height_feet_value", customer.height_feet)
    put("height_inches_value", customer.height_inches)

    mailing = addresses_by_type.get(AddressType.MAILING) or addresses_by_type.get(AddressType.RESIDENTIAL)
    residential = addresses_by_type.get(AddressType.RESIDENTIAL)
    out_of_state = addresses_by_type.get(AddressType.OUT_OF_STATE)

    if mailing:
        put("mailing_street", mailing.street)
        put("mailing_apt", mailing.apt)
        put("mailing_city", mailing.city)
        put("mailing_state", mailing.state)
        put("mailing_zip", mailing.zip_code)
        put("mailing_county", mailing.county)

    # BA-208 "Residential Address (If Different from Mailing)" should remain blank
    # when only one address exists (e.g., residential only). Clear any generic values
    # populated earlier, then set only when a distinct secondary address exists.
    for key in (
        "residential_street",
        "residential_apt",
        "residential_city",
        "residential_state",
        "residential_zip",
        "residential_county",
    ):
        result.pop(key, None)

    # If a second address exists, prefer residential when distinct; otherwise
    # use out-of-state when distinct.
    secondary_address = None
    if residential and mailing and not _is_same_address(residential, mailing):
        secondary_address = residential
    elif out_of_state and mailing and not _is_same_address(out_of_state, mailing):
        secondary_address = out_of_state

    if secondary_address:
        put("residential_street", secondary_address.street)
        put("residential_apt", secondary_address.apt)
        put("residential_city", secondary_address.city)
        put("residential_state", secondary_address.state)
        put("residential_zip", secondary_address.zip_code)
        put("residential_county", secondary_address.county)

    if current_nj:
        put("Check Box1", "Driver License")

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
    target[f"{prefix}_full_address"] = ", ".join([part for part in [address.street, address.apt, address.city, address.state, address.zip_code] if part])


def _with_aliases(data: dict[str, str]) -> dict[str, str]:
    expanded = dict(data)
    for alias, field_name in BA208_FIELD_ALIASES.items():
        if alias in expanded and field_name not in expanded:
            expanded[field_name] = expanded[alias]
        if field_name in expanded and alias not in expanded:
            expanded[alias] = expanded[field_name]
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


def _pick_selected_or_current(items: list[object], selected_id: int | None, item_label: str) -> object | None:
    if selected_id is not None:
        selected = next((item for item in items if getattr(item, "id", None) == selected_id), None)
        if selected is None:
            raise InvalidSelectionError(f"{item_label} {selected_id} not found for customer")
        if not getattr(selected, "active", False):
            raise InvalidSelectionError(f"{item_label} {selected_id} is inactive")
        return selected
    return _pick_current(items)


def _is_same_address(left: object, right: object) -> bool:
    def norm(value: object | None) -> str:
        return str(value or "").strip().lower()

    return (
        norm(getattr(left, "street", None)) == norm(getattr(right, "street", None))
        and norm(getattr(left, "apt", None)) == norm(getattr(right, "apt", None))
        and norm(getattr(left, "city", None)) == norm(getattr(right, "city", None))
        and norm(getattr(left, "state", None)) == norm(getattr(right, "state", None))
        and norm(getattr(left, "zip_code", None)) == norm(getattr(right, "zip_code", None))
        and norm(getattr(left, "county", None)) == norm(getattr(right, "county", None))
    )


def _fmt_date(value: object | None) -> str | None:
    if value is None:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%m/%d/%Y")
    return str(value)


def _format_height(feet: int | None, inches: int | None) -> str | None:
    if feet is None and inches is None:
        return None
    return f"{feet or 0}'{inches or 0}\""
