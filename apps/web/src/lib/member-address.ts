import {
  ADDRESS_COUNTRY_OPTIONS,
  isBangladeshAddress,
  normalizeCountry,
  type MemberAddressValues,
} from "@easymatch/shared";
import type { DropdownMap } from "@/lib/api";

export { isBangladeshAddress, normalizeCountry, type MemberAddressValues };

export function addressCountryOptions(locale: string) {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  const rest = ADDRESS_COUNTRY_OPTIONS.filter(
    (country) => country !== "Bangladesh",
  ).sort((a, b) => collator.compare(a, b));

  return [
    { value: "Bangladesh", label: "Bangladesh" },
    ...rest.map((country) => ({ value: country, label: country })),
  ];
}

export function formatMemberAddress(
  address: MemberAddressValues,
  formatDistrict: (district: string) => string,
  formatDivision: (division: string) => string,
  formatUpazila: (upazila: string) => string = (upazila) => upazila,
) {
  if (isBangladeshAddress(address.country)) {
    return [
      address.addressLine,
      formatUpazila(address.upazila),
      formatDistrict(address.district),
      formatDivision(address.division),
      normalizeCountry(address.country),
    ]
      .filter(Boolean)
      .join(", ");
  }

  return [
    address.addressLine,
    address.cityTown,
    address.division,
    normalizeCountry(address.country),
  ]
    .filter(Boolean)
    .join(", ");
}

export function filterDistrictsForDivision(
  districts: DropdownMap["district"],
  division: string,
) {
  return (districts ?? []).filter((district) => district.parentValue === division);
}

export function filterUpazilasForDistrict(
  upazilas: DropdownMap["upazila"],
  district: string,
) {
  return (upazilas ?? []).filter((upazila) => upazila.parentValue === district);
}
