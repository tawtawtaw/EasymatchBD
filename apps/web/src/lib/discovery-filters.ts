import type { DiscoveryFilters } from "./discovery";

export const EMPTY_DISCOVERY_FILTERS: DiscoveryFilters = {};

export function countActiveFilters(filters: DiscoveryFilters): number {
  return Object.values(filters).filter(
    (value) => value !== undefined && value !== "",
  ).length;
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
