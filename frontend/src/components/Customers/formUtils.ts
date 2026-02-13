import type {
  AddressForm,
  AddressType,
  CustomerAddress,
  CustomerForm,
  CustomerListItem,
  NJForm,
  BrazilForm,
  PassportForm,
} from "./types";

export function defaultAddressForm(): AddressForm {
  return {
    street: "",
    apt: "",
    city: "",
    state: "",
    zip_code: "",
    county: "",
  };
}

export function defaultCustomerForm(): CustomerForm {
  return {
    customer_photo_object_key: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    phone_number: "",
    email: "",
    date_of_birth: "",
    has_no_ssn: false,
    ssn_encrypted: "",
    gender: "",
    eye_color: "",
    weight_lbs: "",
    height_feet: "",
    height_inches: "",
    residential: defaultAddressForm(),
    mailing: defaultAddressForm(),
    out_of_state: defaultAddressForm(),
  };
}

export function defaultNJForm(): NJForm {
  return {
    license_number_encrypted: "",
    issue_date: "",
    expiration_date: "",
    license_class: "",
    endorsements: [],
    restrictions: [],
    is_current: true,
  };
}

export function defaultBrazilForm(): BrazilForm {
  return {
    full_name: "",
    identity_number: "",
    issuing_agency: "",
    issuing_state: "",
    cpf_encrypted: "",
    father_name: "",
    mother_name: "",
    category: "",
    registry_number: "",
    expiration_date: "",
    first_license_date: "",
    observations: "",
    issue_place: "",
    issue_date: "",
    paper_number: "",
    issue_code: "",
    is_current: true,
  };
}

export function defaultPassportForm(): PassportForm {
  return {
    document_type: "",
    issuing_country: "",
    passport_number_encrypted: "",
    surname: "",
    given_name: "",
    middle_name: "",
    father_name: "",
    mother_name: "",
    nationality: "",
    birth_place: "",
    issue_date: "",
    expiration_date: "",
    issuing_authority: "",
    is_current: true,
  };
}

export function normalizeString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function fullName(c: CustomerListItem): string {
  return `${c.first_name} ${c.last_name}`.trim();
}

export function mapAddressForm(addresses: CustomerAddress[], addressType: AddressType): AddressForm {
  const found = addresses.find((item) => item.address_type === addressType);
  if (!found) {
    return defaultAddressForm();
  }
  return {
    street: found.street,
    apt: found.apt ?? "",
    city: found.city,
    state: found.state,
    zip_code: found.zip_code,
    county: found.county ?? "",
  };
}
