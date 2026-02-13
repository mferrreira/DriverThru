import type { Gender, NJEndorsement, NJLicenseClass, NJRestriction } from "./types";

export const genderOptions: Array<{ value: Gender; label: string }> = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non Binary" },
  { value: "undisclosed", label: "Undisclosed" },
];

export const eyeColorOptions = ["Black", "Blue", "Brown", "Green", "Gray", "Hazel", "Other"];
export const njClassOptions: NJLicenseClass[] = ["A", "B", "C", "D", "E", "I"];
export const njEndorsementOptions: NJEndorsement[] = ["M", "F", "H", "N", "P", "S", "T", "X"];
export const njRestrictionOptions: NJRestriction[] = ["1", "2", "3", "4", "L", "P"];
export const brazilCategoryOptions = ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"];
