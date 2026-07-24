export type UpazilaDropdownItem = {
  value: string;
  label: string;
  parentValue?: string | null;
};

export function upazilasForDistrict(
  upazilas: UpazilaDropdownItem[] | undefined,
  district: string,
) {
  if (!upazilas?.length || !district) return [];
  return upazilas.filter((upazila) => upazila.parentValue === district);
}

export function upazilaLabel(
  upazilas: UpazilaDropdownItem[] | undefined,
  value: string,
) {
  if (!value) return "";
  return upazilas?.find((upazila) => upazila.value === value)?.label ?? value;
}
