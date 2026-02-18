from __future__ import annotations

import csv
from datetime import UTC, date, datetime, timedelta
from io import StringIO
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.customers.models import BrazilDriverLicense, Customer, CustomerAddress, NJDriverLicense, Passport


def build_all_customers_csv(db: Session) -> tuple[str, str]:
    stmt = (
        select(Customer)
        .where(Customer.active.is_(True))
        .options(
            selectinload(Customer.addresses),
            selectinload(Customer.nj_driver_licenses).selectinload(NJDriverLicense.endorsements),
            selectinload(Customer.nj_driver_licenses).selectinload(NJDriverLicense.restrictions),
            selectinload(Customer.brazil_driver_licenses),
            selectinload(Customer.passports),
        )
        .order_by(Customer.created_at.desc())
    )
    customers = list(db.scalars(stmt).all())

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Customer ID",
            "First name",
            "Middle name",
            "Last name",
            "Suffix",
            "Phone",
            "Email",
            "Date of birth",
            "Has no SSN",
            "SSN/ITIN",
            "Gender",
            "Eye color (CLR)",
            "Weight (lbs)",
            "Height (feet)",
            "Height (inches)",
            "Created at",
            "Updated at",
            "Mailing street",
            "Mailing apt",
            "Mailing city",
            "Mailing state",
            "Mailing zip code",
            "Mailing county",
            "Residential street",
            "Residential apt",
            "Residential city",
            "Residential state",
            "Residential zip code",
            "Residential county",
            "Out-of-state street",
            "Out-of-state apt",
            "Out-of-state city",
            "Out-of-state state",
            "Out-of-state zip code",
            "Out-of-state county",
            "NJ licenses total",
            "NJ current license number",
            "NJ current issue date",
            "NJ current expiration date",
            "NJ current class",
            "NJ current endorsements",
            "NJ current restrictions",
            "Brazil licenses total",
            "Brazil current full name",
            "Brazil current CPF",
            "Brazil current category",
            "Brazil current registry number",
            "Brazil current issue date",
            "Brazil current expiration date",
            "Passports total",
            "Passport current number",
            "Passport current document type",
            "Passport current issuing country",
            "Passport current nationality",
            "Passport current issue date",
            "Passport current expiration date",
        ]
    )

    for customer in customers:
        addresses = {address.address_type.value: address for address in customer.addresses if address.active}
        mailing = addresses.get("mailing")
        residential = addresses.get("residential")
        out_of_state = addresses.get("out_of_state")

        nj_primary = _primary_document(customer.nj_driver_licenses)
        br_primary = _primary_document(customer.brazil_driver_licenses)
        passport_primary = _primary_document(customer.passports)

        writer.writerow(
            [
                customer.id,
                customer.first_name,
                customer.middle_name,
                customer.last_name,
                customer.suffix,
                customer.phone_number,
                customer.email,
                _format_date(customer.date_of_birth),
                _format_bool(customer.has_no_ssn),
                customer.ssn_encrypted,
                customer.gender.value.upper() if customer.gender else "",
                customer.eye_color,
                customer.weight_lbs,
                customer.height_feet,
                customer.height_inches,
                _format_datetime(customer.created_at),
                _format_datetime(customer.updated_at),
                _address_value(mailing, "street"),
                _address_value(mailing, "apt"),
                _address_value(mailing, "city"),
                _address_value(mailing, "state"),
                _address_value(mailing, "zip_code"),
                _address_value(mailing, "county"),
                _address_value(residential, "street"),
                _address_value(residential, "apt"),
                _address_value(residential, "city"),
                _address_value(residential, "state"),
                _address_value(residential, "zip_code"),
                _address_value(residential, "county"),
                _address_value(out_of_state, "street"),
                _address_value(out_of_state, "apt"),
                _address_value(out_of_state, "city"),
                _address_value(out_of_state, "state"),
                _address_value(out_of_state, "zip_code"),
                _address_value(out_of_state, "county"),
                len([item for item in customer.nj_driver_licenses if item.active]),
                nj_primary.license_number_encrypted if nj_primary else "",
                _format_date(nj_primary.issue_date if nj_primary else None),
                _format_date(nj_primary.expiration_date if nj_primary else None),
                nj_primary.license_class.value if nj_primary and nj_primary.license_class else "",
                ", ".join(item.code.value for item in nj_primary.endorsements) if nj_primary else "",
                ", ".join(item.code.value for item in nj_primary.restrictions) if nj_primary else "",
                len([item for item in customer.brazil_driver_licenses if item.active]),
                br_primary.full_name if br_primary else "",
                br_primary.cpf_encrypted if br_primary else "",
                br_primary.category if br_primary else "",
                br_primary.registry_number if br_primary else "",
                _format_date(br_primary.issue_date if br_primary else None),
                _format_date(br_primary.expiration_date if br_primary else None),
                len([item for item in customer.passports if item.active]),
                passport_primary.passport_number_encrypted if passport_primary else "",
                passport_primary.document_type if passport_primary else "",
                passport_primary.issuing_country if passport_primary else "",
                passport_primary.nationality if passport_primary else "",
                _format_date(passport_primary.issue_date if passport_primary else None),
                _format_date(passport_primary.expiration_date if passport_primary else None),
            ]
        )

    content = buffer.getvalue()
    filename = f"customers_full_export_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.csv"
    return content, filename


def build_expiring_licenses_csv(db: Session, months_ahead: int = 3) -> tuple[str, str]:
    months_ahead = max(1, months_ahead)
    today = datetime.now(UTC).date()
    horizon = _add_months(today, months_ahead)

    nj_stmt = (
        select(Customer, NJDriverLicense)
        .join(NJDriverLicense, NJDriverLicense.customer_id == Customer.id)
        .where(
            Customer.active.is_(True),
            NJDriverLicense.active.is_(True),
            NJDriverLicense.is_current.is_(True),
            NJDriverLicense.expiration_date.is_not(None),
            NJDriverLicense.expiration_date >= today,
            NJDriverLicense.expiration_date <= horizon,
        )
        .order_by(NJDriverLicense.expiration_date.asc(), Customer.last_name.asc(), Customer.first_name.asc())
    )

    br_stmt = (
        select(Customer, BrazilDriverLicense)
        .join(BrazilDriverLicense, BrazilDriverLicense.customer_id == Customer.id)
        .where(
            Customer.active.is_(True),
            BrazilDriverLicense.active.is_(True),
            BrazilDriverLicense.is_current.is_(True),
            BrazilDriverLicense.expiration_date.is_not(None),
            BrazilDriverLicense.expiration_date >= today,
            BrazilDriverLicense.expiration_date <= horizon,
        )
        .order_by(BrazilDriverLicense.expiration_date.asc(), Customer.last_name.asc(), Customer.first_name.asc())
    )

    nj_rows = db.execute(nj_stmt).all()
    br_rows = db.execute(br_stmt).all()

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Customer ID",
            "Customer name",
            "Email",
            "Phone",
            "Document type",
            "Document ID",
            "License identifier",
            "Issue date",
            "Expiration date",
            "Days until expiration",
            "Customer created at",
        ]
    )

    for customer, license_obj in nj_rows:
        expiration_date = license_obj.expiration_date
        writer.writerow(
            [
                customer.id,
                f"{customer.first_name} {customer.last_name}".strip(),
                customer.email,
                customer.phone_number,
                "NJ Driver License",
                license_obj.id,
                license_obj.license_number_encrypted,
                _format_date(license_obj.issue_date),
                _format_date(expiration_date),
                (expiration_date - today).days if expiration_date else None,
                _format_datetime(customer.created_at),
            ]
        )

    for customer, license_obj in br_rows:
        expiration_date = license_obj.expiration_date
        writer.writerow(
            [
                customer.id,
                f"{customer.first_name} {customer.last_name}".strip(),
                customer.email,
                customer.phone_number,
                "Brazil Driver License",
                license_obj.id,
                license_obj.registry_number,
                _format_date(license_obj.issue_date),
                _format_date(expiration_date),
                (expiration_date - today).days if expiration_date else None,
                _format_datetime(customer.created_at),
            ]
        )

    content = buffer.getvalue()
    filename = f"licenses_expiring_{months_ahead}m_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.csv"
    return content, filename


def _add_months(initial_date: date, months: int) -> date:
    return initial_date + timedelta(days=31 * months)


def _format_date(value: date | None) -> str:
    if value is None:
        return ""
    return value.strftime("%m/%d/%Y")


def _format_datetime(value: datetime | None) -> str:
    if value is None:
        return ""
    return value.astimezone(UTC).strftime("%m/%d/%Y %H:%M")


def _format_bool(value: bool) -> str:
    return "Yes" if value else "No"


def _address_value(address: CustomerAddress | None, field: str) -> str:
    if not address:
        return ""
    return str(getattr(address, field) or "")


def _primary_document(items: list[Any]):
    active_items = [item for item in items if item.active]
    if not active_items:
        return None
    current = [item for item in active_items if getattr(item, "is_current", False)]
    if current:
        current.sort(key=lambda item: (item.updated_at or datetime.min.replace(tzinfo=UTC), item.id), reverse=True)
        return current[0]
    active_items.sort(key=lambda item: (item.updated_at or datetime.min.replace(tzinfo=UTC), item.id), reverse=True)
    return active_items[0]
