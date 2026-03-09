from __future__ import annotations

from typing import Literal

from sqlalchemy.orm import Session

from app.modules.customers.models import Customer
from app.modules.customers.schemas import (
    BrazilDriverLicenseCreate,
    CustomerCreate,
    NJDriverLicenseCreate,
    PassportCreate,
)
from app.modules.customers.services.customers import create_customer, get_customer_or_404
from app.modules.customers.services.document_files import (
    upload_brazil_license_document_file,
    upload_nj_license_document_file,
    upload_passport_document_file,
)

InitialDocumentKind = Literal["nj_driver_license", "brazil_driver_license", "passport"]
InitialDocumentPayload = NJDriverLicenseCreate | BrazilDriverLicenseCreate | PassportCreate


def create_customer_with_initial_document(
    *,
    db: Session,
    customer_payload: CustomerCreate,
    document_kind: InitialDocumentKind,
    document_payload: InitialDocumentPayload,
    file_payload: bytes,
    file_name: str | None,
    content_type: str | None,
) -> Customer:
    # Reuse existing aggregate creation path, but force only one initial document
    # so the upload target is deterministic.
    create_payload = _prepare_customer_payload_with_single_document(
        customer_payload=customer_payload,
        document_kind=document_kind,
        document_payload=document_payload,
    )
    customer = create_customer(db=db, payload=create_payload)

    if document_kind == "nj_driver_license":
        license_id = customer.nj_driver_licenses[0].id
        upload_nj_license_document_file(
            db=db,
            customer_id=customer.id,
            license_id=license_id,
            payload=file_payload,
            file_name=file_name,
            content_type=content_type,
        )
    elif document_kind == "brazil_driver_license":
        license_id = customer.brazil_driver_licenses[0].id
        upload_brazil_license_document_file(
            db=db,
            customer_id=customer.id,
            license_id=license_id,
            payload=file_payload,
            file_name=file_name,
            content_type=content_type,
        )
    else:
        passport_id = customer.passports[0].id
        upload_passport_document_file(
            db=db,
            customer_id=customer.id,
            passport_id=passport_id,
            payload=file_payload,
            file_name=file_name,
            content_type=content_type,
        )

    return get_customer_or_404(db, customer.id)


def _prepare_customer_payload_with_single_document(
    *,
    customer_payload: CustomerCreate,
    document_kind: InitialDocumentKind,
    document_payload: InitialDocumentPayload,
) -> CustomerCreate:
    data = customer_payload.model_dump()
    data["nj_driver_licenses"] = []
    data["brazil_driver_licenses"] = []
    data["passports"] = []

    if document_kind == "nj_driver_license":
        if not isinstance(document_payload, NJDriverLicenseCreate):
            raise ValueError("Invalid document payload for NJ driver license.")
        data["nj_driver_licenses"] = [document_payload.model_dump()]
    elif document_kind == "brazil_driver_license":
        if not isinstance(document_payload, BrazilDriverLicenseCreate):
            raise ValueError("Invalid document payload for Brazil driver license.")
        data["brazil_driver_licenses"] = [document_payload.model_dump()]
    else:
        if not isinstance(document_payload, PassportCreate):
            raise ValueError("Invalid document payload for passport.")
        data["passports"] = [document_payload.model_dump()]

    return CustomerCreate.model_validate(data)
