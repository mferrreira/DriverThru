import type { EyeColor, Gender, NJEndorsement, NJLicenseClass, NJRestriction } from "./types";

export const genderOptions: Array<{ value: Gender; label: string }> = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non Binary" },
  { value: "undisclosed", label: "Undisclosed" },
];

export const eyeColorOptions: Array<{ value: EyeColor; label: string }> = [
  { value: "BLK", label: "BLK (Black)" },
  { value: "BLU", label: "BLU (Blue)" },
  { value: "BRN", label: "BRO/BRN (Brown)" },
  { value: "GRN", label: "GRN (Green)" },
  { value: "GRY", label: "GRY (Gray)" },
  { value: "HAZ", label: "HAZ (Hazel)" },
  { value: "MAR", label: "MAR (Maroon)" },
  { value: "MUL", label: "MUL (Multicolor/Heterochromia)" },
  { value: "XXX", label: "XXX (Unknown)" },
];
export const njClassOptions: NJLicenseClass[] = ["A", "B", "C", "D", "E", "I"];
export const njEndorsementOptions: NJEndorsement[] = ["M", "F", "H", "N", "P", "S", "T", "X"];
export const njRestrictionOptions: NJRestriction[] = ["1", "2", "3", "4", "L", "P"];
export const brazilCategoryOptions = ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"];
