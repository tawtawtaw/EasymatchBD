export type DistrictDropdownItem = {
  value: string;
  label: string;
  parentValue?: string | null;
};

export function districtsForDivision(
  districts: DistrictDropdownItem[] | undefined,
  division: string,
) {
  if (!districts?.length || !division) return [];
  return districts.filter((district) => district.parentValue === division);
}

export function districtLabel(
  districts: DistrictDropdownItem[] | undefined,
  value: string,
) {
  if (!value) return "";
  return districts?.find((district) => district.value === value)?.label ?? value;
}

export function districtLabels(
  districts: DistrictDropdownItem[] | undefined,
  values: string[],
) {
  return values.map((value) => districtLabel(districts, value)).filter(Boolean);
}
