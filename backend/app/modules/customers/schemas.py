from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.customers.models import (
    AddressType,
    Gender,
    NJEndorsementCode,
    NJLicenseClass,
    NJRestrictionCode,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CustomerAddressBase(BaseModel):
    address_type: AddressType
    street: str = Field(max_length=255)
    apt: str | None = Field(default=None, max_length=30)
    city: str = Field(max_length=120)
    state: str = Field(min_length=2, max_length=2)
    zip_code: str = Field(max_length=10)
    county: str | None = Field(default=None, max_length=120)


class CustomerAddressCreate(CustomerAddressBase):
    pass


class CustomerAddressRead(CustomerAddressBase, ORMModel):
    id: int
    customer_id: int
    created_at: datetime
    updated_at: datetime
    active: bool


class NJDriverLicenseBase(BaseModel):
    issue_date: date | None = None
    expiration_date: date | None = None
    license_class: NJLicenseClass | None = None
    is_current: bool = True


class NJDriverLicenseCreate(NJDriverLicenseBase):
    license_number_encrypted: str
    endorsements: list[NJEndorsementCode] = Field(default_factory=list)
    restrictions: list[NJRestrictionCode] = Field(default_factory=list)


class NJDriverLicenseEndorsementRead(ORMModel):
    id: int
    code: NJEndorsementCode


class NJDriverLicenseRestrictionRead(ORMModel):
    id: int
    code: NJRestrictionCode


class NJDriverLicenseRead(NJDriverLicenseBase, ORMModel):
    id: int
    customer_id: int
    license_number_encrypted: str
    endorsements: list[NJDriverLicenseEndorsementRead] = Field(default_factory=list)
    restrictions: list[NJDriverLicenseRestrictionRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    active: bool


class BrazilDriverLicenseBase(BaseModel):
    full_name: str = Field(max_length=255)
    identity_number: str | None = Field(default=None, max_length=50)
    issuing_agency: str | None = Field(default=None, max_length=120)
    issuing_state: str | None = Field(default=None, min_length=2, max_length=2)
    father_name: str | None = Field(default=None, max_length=255)
    mother_name: str | None = Field(default=None, max_length=255)
    category: str | None = Field(default=None, max_length=10)
    registry_number: str | None = Field(default=None, max_length=50)
    expiration_date: date | None = None
    first_license_date: date | None = None
    observations: str | None = None
    issue_place: str | None = Field(default=None, max_length=120)
    issue_date: date | None = None
    paper_number: str | None = Field(default=None, max_length=50)
    issue_code: str | None = Field(default=None, max_length=50)
    is_current: bool = True


class BrazilDriverLicenseCreate(BrazilDriverLicenseBase):
    cpf_encrypted: str | None = None


class BrazilDriverLicenseRead(BrazilDriverLicenseBase, ORMModel):
    id: int
    customer_id: int
    cpf_encrypted: str | None = None
    created_at: datetime
    updated_at: datetime
    active: bool


class PassportBase(BaseModel):
    document_type: str | None = Field(default=None, max_length=50)
    issuing_country: str | None = Field(default=None, max_length=80)
    surname: str = Field(max_length=120)
    given_name: str = Field(max_length=120)
    middle_name: str | None = Field(default=None, max_length=120)
    father_name: str | None = Field(default=None, max_length=255)
    mother_name: str | None = Field(default=None, max_length=255)
    nationality: str | None = Field(default=None, max_length=80)
    birth_place: str | None = Field(default=None, max_length=255)
    issue_date: date | None = None
    expiration_date: date | None = None
    issuing_authority: str | None = Field(default=None, max_length=120)
    is_current: bool = True


class PassportCreate(PassportBase):
    passport_number_encrypted: str


class PassportRead(PassportBase, ORMModel):
    id: int
    customer_id: int
    passport_number_encrypted: str
    created_at: datetime
    updated_at: datetime
    active: bool


class CustomerBase(BaseModel):
    customer_photo_object_key: str | None = Field(default=None, max_length=255)
    first_name: str = Field(max_length=120)
    middle_name: str | None = Field(default=None, max_length=120)
    last_name: str = Field(max_length=120)
    suffix: str | None = Field(default=None, max_length=30)
    phone_number: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None
    date_of_birth: date
    has_no_ssn: bool = False
    ssn_encrypted: str | None = None
    gender: Gender | None = None
    eye_color: str | None = Field(default=None, max_length=30)
    weight_lbs: Decimal | None = None
    height_feet: int | None = None
    height_inches: int | None = None


class CustomerCreate(CustomerBase):
    addresses: list[CustomerAddressCreate] = Field(default_factory=list)
    nj_driver_licenses: list[NJDriverLicenseCreate] = Field(default_factory=list)
    brazil_driver_licenses: list[BrazilDriverLicenseCreate] = Field(default_factory=list)
    passports: list[PassportCreate] = Field(default_factory=list)


class CustomerUpdate(BaseModel):
    customer_photo_object_key: str | None = Field(default=None, max_length=255)
    first_name: str | None = Field(default=None, max_length=120)
    middle_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    suffix: str | None = Field(default=None, max_length=30)
    phone_number: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None
    date_of_birth: date | None = None
    has_no_ssn: bool | None = None
    ssn_encrypted: str | None = None
    gender: Gender | None = None
    eye_color: str | None = Field(default=None, max_length=30)
    weight_lbs: Decimal | None = None
    height_feet: int | None = None
    height_inches: int | None = None
    active: bool | None = None


class CustomerRead(CustomerBase, ORMModel):
    id: int
    addresses: list[CustomerAddressRead] = Field(default_factory=list)
    nj_driver_licenses: list[NJDriverLicenseRead] = Field(default_factory=list)
    brazil_driver_licenses: list[BrazilDriverLicenseRead] = Field(default_factory=list)
    passports: list[PassportRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    active: bool
