import type { DiscoveryFilters } from "@/lib/discovery";

const FILTER_KEYS = [
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
] as const;

export function filtersFromSearchParams(
  params: URLSearchParams,
): DiscoveryFilters {
  const filters: DiscoveryFilters = {};
  for (const key of FILTER_KEYS) {
    const value = params.get(key)?.trim();
    if (value) {
      filters[key] = value;
    }
  }
  return filters;
}

export function searchParamsFromFilters(filters: DiscoveryFilters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  return params;
}
