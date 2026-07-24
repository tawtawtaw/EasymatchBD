import { formatHeightFromCm } from "@easymatch/shared";
import type { DiscoveryFilters } from "../types/discovery-filters";
import { FILTER_QUERY_KEYS } from "../types/discovery-filters";

export const EMPTY_DISCOVERY_FILTERS: DiscoveryFilters = {};

export function countActiveFilters(filters: DiscoveryFilters): number {
  return Object.values(filters).filter((value) => value !== undefined && value !== "").length;
}

export function filtersToSearchParams(filters: DiscoveryFilters, page: number, limit: number) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  for (const key of FILTER_QUERY_KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}

export function setFilterField(
  draft: DiscoveryFilters,
  key: keyof DiscoveryFilters,
  value: string,
): DiscoveryFilters {
  return { ...draft, [key]: value || undefined };
}

export function filtersFromPartnerPreference(pref: {
  ageMin?: number | null;
  ageMax?: number | null;
  heightMinCm?: number | null;
  heightMaxCm?: number | null;
  weightMinKg?: number | null;
  weightMaxKg?: number | null;
  preferredDistricts?: string[];
  minimumEducation?: string | null;
  preferredProfession?: string[];
  maritalStatusPref?: string[];
} | null | undefined): DiscoveryFilters {
  if (!pref) return {};

  const filters: DiscoveryFilters = {};

  if (pref.ageMin != null) filters.ageMin = String(pref.ageMin);
  if (pref.ageMax != null) filters.ageMax = String(pref.ageMax);
  if (pref.heightMinCm != null) filters.heightMinCm = String(pref.heightMinCm);
  if (pref.heightMaxCm != null) filters.heightMaxCm = String(pref.heightMaxCm);
  if (pref.weightMinKg != null) filters.weightMinKg = String(pref.weightMinKg);
  if (pref.weightMaxKg != null) filters.weightMaxKg = String(pref.weightMaxKg);
  if (pref.minimumEducation) filters.education = pref.minimumEducation;
  if (pref.preferredProfession?.length === 1) {
    filters.occupation = pref.preferredProfession[0];
  }
  if (pref.maritalStatusPref?.length === 1) {
    filters.maritalStatus = pref.maritalStatusPref[0];
  }
  if (pref.preferredDistricts?.length === 1) {
    filters.district = pref.preferredDistricts[0];
  }

  return filters;
}

const FILTER_DROPDOWN_CATEGORY: Record<string, string> = {
  gender: "gender",
  maritalStatus: "marital_status",
  religion: "religion",
  complexion: "complexion",
  education: "education",
  occupation: "occupation",
  incomeRange: "income_range",
  division: "division",
  district: "district",
  familyType: "family_type",
  familyStatus: "family_status",
};

export function formatFilterChipLabel(
  key: string,
  value: string,
  dropdowns: Record<string, { value: string; label: string }[]>,
  labels: Record<string, string>,
): string {
  const label = labels[key] ?? key;

  if (key === "hasDisability") {
    return `${label}: ${value === "true" ? labels.filterDisabilityYes : labels.filterDisabilityNo}`;
  }

  if (key === "heightMinCm" || key === "heightMaxCm") {
    const formatted = formatHeightFromCm(Number(value));
    return `${label}: ${formatted ?? value}`;
  }

  const category = FILTER_DROPDOWN_CATEGORY[key];
  const option = category
    ? dropdowns[category]?.find((item) => item.value === value)
    : undefined;

  return `${label}: ${option?.label ?? value}`;
}
