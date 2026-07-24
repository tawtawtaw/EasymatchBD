/** Marker in comparison rows when no specific districts are selected (open to all of BD). */
export const ALL_BANGLADESH_DISTRICTS_PREFERENCE_TOKEN =
  '__all_bangladesh_districts__';

/** Empty or missing list means open to any district in Bangladesh. */
export function isOpenToAllDistricts(
  preferredDistricts?: string[] | null,
): boolean {
  return !preferredDistricts || preferredDistricts.length === 0;
}

export function matchesPreferredDistricts(
  preferredDistricts: string[] | null | undefined,
  candidateDistrict: string | null | undefined,
): boolean {
  if (!candidateDistrict) return false;
  if (isOpenToAllDistricts(preferredDistricts)) return true;
  return preferredDistricts!.includes(candidateDistrict);
}

export function preferredDistrictsPreferenceText(
  preferredDistricts: string[] | null | undefined,
): string {
  if (isOpenToAllDistricts(preferredDistricts)) {
    return ALL_BANGLADESH_DISTRICTS_PREFERENCE_TOKEN;
  }
  return preferredDistricts!.join(', ');
}

export function isAllBangladeshDistrictsPreferenceText(
  value: string | null | undefined,
): boolean {
  return value === ALL_BANGLADESH_DISTRICTS_PREFERENCE_TOKEN;
}
