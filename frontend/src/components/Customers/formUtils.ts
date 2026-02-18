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
  if (trimmed.length === 0) {
    return null;
  }

  // Already normalized date input (<input type="date">)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Accept slash-delimited dates and normalize to YYYY-MM-DD for API payload.
  // Supports either MM/DD/YYYY (US) or DD/MM/YYYY when day > 12.
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!slashMatch) {
    return trimmed;
  }

  const first = Number(slashMatch[1]);
  const second = Number(slashMatch[2]);
  const year = Number(slashMatch[3]);
  if (year < 1900 || year > 2100) {
    return trimmed;
  }

  let month = first;
  let day = second;
  if (first > 12 && second <= 12) {
    day = first;
    month = second;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return trimmed;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function formatDateForForm(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${month}/${day}/${year}`;
  }
  return value;
}

export function normalizeEyeColor(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const upper = value.trim().toUpperCase();
  const legacyMap: Record<string, string> = {
    BLACK: "BLK",
    BLUE: "BLU",
    BRO: "BRN",
    BRN: "BRN",
    BROWN: "BRN",
    GREEN: "GRN",
    GRAY: "GRY",
    GREY: "GRY",
    HAZEL: "HAZ",
    MAROON: "MAR",
    MULTICOLOR: "MUL",
    HETEROCHROMIA: "MUL",
    UNKNOWN: "XXX",
  };
  return legacyMap[upper] ?? upper;
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
