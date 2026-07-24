export type DiscoveryFilters = {
  profileCode?: string;
  gender?: string;
  division?: string;
  district?: string;
  maritalStatus?: string;
  religion?: string;
  complexion?: string;
  education?: string;
  occupation?: string;
  incomeRange?: string;
  ageMin?: string;
  ageMax?: string;
  heightMinCm?: string;
  heightMaxCm?: string;
  weightMinKg?: string;
  weightMaxKg?: string;
  hasDisability?: string;
  familyType?: string;
  familyStatus?: string;
};

export const FILTER_QUERY_KEYS: (keyof DiscoveryFilters)[] = [
  "profileCode",
  "gender",
  "division",
  "district",
  "maritalStatus",
  "religion",
  "complexion",
  "education",
  "occupation",
  "incomeRange",
  "ageMin",
  "ageMax",
  "heightMinCm",
  "heightMaxCm",
  "weightMinKg",
  "weightMaxKg",
  "hasDisability",
  "familyType",
  "familyStatus",
];
