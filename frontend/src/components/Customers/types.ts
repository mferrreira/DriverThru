export type Gender = "female" | "male" | "non_binary" | "undisclosed";
export type EyeColor = "BLK" | "BLU" | "BRN" | "GRN" | "GRY" | "HAZ" | "MAR" | "MUL" | "XXX";
export type NJLicenseClass = "A" | "B" | "C" | "D" | "E" | "I";
export type NJEndorsement = "M" | "F" | "H" | "N" | "P" | "S" | "T" | "X";
export type NJRestriction = "1" | "2" | "3" | "4" | "L" | "P";
export type AddressType = "residential" | "mailing" | "out_of_state";

export type CustomerAddress = {
  id: number;
  address_type: AddressType;
  street: string;
  apt: string | null;
  city: string;
  state: string;
  zip_code: string;
  county: string | null;
};

export type NJDriverLicense = {
  id: number;
  license_number_encrypted: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  license_class: NJLicenseClass | null;
  is_current: boolean;
  active: boolean;
  endorsements: Array<{ id: number; code: NJEndorsement }>;
  restrictions: Array<{ id: number; code: NJRestriction }>;
};

export type BrazilDriverLicense = {
  id: number;
  full_name: string;
  identity_number: string | null;
  issuing_agency: string | null;
  issuing_state: string | null;
  cpf_encrypted: string | null;
  father_name: string | null;
  mother_name: string | null;
  category: string | null;
  registry_number: string | null;
  expiration_date: string | null;
  first_license_date: string | null;
  observations: string | null;
  issue_place: string | null;
  issue_date: string | null;
  paper_number: string | null;
  issue_code: string | null;
  is_current: boolean;
  active: boolean;
};

export type Passport = {
  id: number;
  document_type: string | null;
  issuing_country: string | null;
  passport_number_encrypted: string;
  surname: string;
  given_name: string;
  middle_name: string | null;
  father_name: string | null;
  mother_name: string | null;
  nationality: string | null;
  birth_place: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  issuing_authority: string | null;
  is_current: boolean;
  active: boolean;
};

export type CustomerListItem = {
  id: number;
  first_name: string;
  middle_name: string | null;
  customer_photo_object_key: string | null;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  date_of_birth: string;
  active: boolean;
};

export type CustomerListResponse = {
  items: CustomerListItem[];
  total: number;
  page: number;
  size: number;
};

export type CustomerRead = {
  id: number;
  customer_photo_object_key: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  phone_number: string | null;
  email: string | null;
  date_of_birth: string;
  has_left_country: boolean;
  has_no_ssn: boolean;
  ssn_encrypted: string | null;
  gender: Gender | null;
  eye_color: string | null;
  weight_lbs: string | null;
  height_feet: number | null;
  height_inches: number | null;
  addresses: CustomerAddress[];
  nj_driver_licenses: NJDriverLicense[];
  brazil_driver_licenses: BrazilDriverLicense[];
  passports: Passport[];
};

export type AddressForm = {
  street: string;
  apt: string;
  city: string;
  state: string;
  zip_code: string;
  county: string;
};

export type CustomerForm = {
  customer_photo_object_key: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  phone_number: string;
  email: string;
  date_of_birth: string;
  has_left_country: boolean;
  has_no_ssn: boolean;
  ssn_encrypted: string;
  gender: "" | Gender;
  eye_color: "" | EyeColor;
  weight_lbs: string;
  height_feet: string;
  height_inches: string;
  residential: AddressForm;
  mailing: AddressForm;
  out_of_state: AddressForm;
};

export type NJForm = {
  license_number_encrypted: string;
  issue_date: string;
  expiration_date: string;
  license_class: "" | NJLicenseClass;
  endorsements: NJEndorsement[];
  restrictions: NJRestriction[];
  is_current: boolean;
};

export type BrazilForm = {
  full_name: string;
  identity_number: string;
  issuing_agency: string;
  issuing_state: string;
  cpf_encrypted: string;
  father_name: string;
  mother_name: string;
  category: string;
  registry_number: string;
  expiration_date: string;
  first_license_date: string;
  observations: string;
  issue_place: string;
  issue_date: string;
  paper_number: string;
  issue_code: string;
  is_current: boolean;
};

export type PassportForm = {
  document_type: string;
  issuing_country: string;
  passport_number_encrypted: string;
  surname: string;
  given_name: string;
  middle_name: string;
  father_name: string;
  mother_name: string;
  nationality: string;
  birth_place: string;
  issue_date: string;
  expiration_date: string;
  issuing_authority: string;
  is_current: boolean;
};
