/** Marker in comparison rows when no partner religion is selected (open to any). */
export const ANY_RELIGION_PREFERENCE_TOKEN = '__any_religion__';

export function isOpenToAnyReligion(
  preferredReligion?: string | null,
): boolean {
  return preferredReligion == null || preferredReligion.trim() === '';
}

export function matchesPreferredReligion(
  preferredReligion: string | null | undefined,
  candidateReligion: string | null | undefined,
): boolean {
  if (!candidateReligion) return false;
  if (isOpenToAnyReligion(preferredReligion)) return true;
  return preferredReligion === candidateReligion;
}

export function preferredReligionPreferenceText(
  preferredReligion: string | null | undefined,
): string | null {
  if (isOpenToAnyReligion(preferredReligion)) {
    return ANY_RELIGION_PREFERENCE_TOKEN;
  }
  return preferredReligion ?? null;
}

export function isAnyReligionPreferenceText(
  value: string | null | undefined,
): boolean {
  return value === ANY_RELIGION_PREFERENCE_TOKEN;
}
