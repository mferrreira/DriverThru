from __future__ import annotations

from app.modules.documents.schemas import TemplateKey

TEMPLATE_FILES: dict[TemplateKey, str] = {
    "affidavit": "affidavit.pdf",
    "ba208": "BA-208.pdf",
}

BA208_FIELD_ALIASES: dict[str, str] = {
    "nj_driver_license_number": "NJ Driver License or NonDriver ID Number",
    "social_security_number_or_itin": "Social Security Number or ITIN",
    "mailing_street": "Mailing Address Street PO Box",
    "mailing_apt": "AptFloorUnit",
    "mailing_city": "City",
    "mailing_state": "State",
    "mailing_zip": "Zip",
    "mailing_county": "County",
    "residential_street": "Residential Address If Different from Mailing",
    "residential_apt": "AptFloorUnit_2",
    "residential_city": "City_2",
    "residential_state": "State_2",
    "residential_zip": "Zip_2",
    "residential_county": "County_2",
    "signature_date": "Date",
    "height_feet_value": "Height",
    "height_inches_value": "ft",
    "dob_month": "Full Date of Birth",
    "dob_day": "undefined",
    "dob_year": "undefined_2",
    "document_type": "Check Box1",
    "select_all_standard": "Check Box2.0",
    "select_all_real_id": "Check Box2.1",
    "select_all_motorcycle": "Check Box2.2",
    "select_all_boat": "Check Box2.3",
    "select_all_moped": "Check Box2.4",
    "select_all_agricultural": "Check Box2.5",
    "question_1": "Check Box3",
    "question_2": "Check Box4",
}

AFFIDAVIT_OVERLAY_FIELDS = [
    "full_name",
    "date_of_birth",
    "applicant_date",
]

# (value key, anchor text, x offset, y offset, font size)
AFFIDAVIT_ANCHOR_RULES: list[tuple[str, str, float, float, int]] = [
    ("full_name", "I,", 26.0, 0.0, 11),
    ("date_of_birth", "born on", 54.0, 0.0, 11),
    ("applicant_date", "Date", 0.0, 12.0, 11),
    ("full_name", "witnessed", 120.0, 0.0, 11),
]
