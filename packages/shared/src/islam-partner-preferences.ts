import {
  FEMALE_GENDER_VALUE,
  HIJAB_PRACTICE_VALUES,
  ISLAM_RELIGION_VALUE,
  MALE_GENDER_VALUE,
  isIslamReligion,
} from './islam-profile-fields';

export const BEARD_PREFERENCE_VALUES = ['yes', 'no', 'no_opinion'] as const;
export type BeardPreferenceValue = (typeof BEARD_PREFERENCE_VALUES)[number];

export const PRAYER_PREFERENCE_VALUES = [
  'regular_five_times',
  'no_opinion',
  'modestly_practicing',
] as const;
export type PrayerPreferenceValue = (typeof PRAYER_PREFERENCE_VALUES)[number];

export const HIJAB_PREFERENCE_VALUES = [
  'regular_hijabi_partner',
  'irregular_hijabi_ok',
  'no_hijab_needed',
  'intention_to_wear_hijab',
] as const;
export type HijabPreferenceValue = (typeof HIJAB_PREFERENCE_VALUES)[number];

/** Legacy partner prefs stored with hijab_practice slugs before hijab_preference existed. */
const LEGACY_HIJAB_PREFERENCE_FROM_PRACTICE: Record<
  string,
  HijabPreferenceValue
> = {
  wear_regularly: 'regular_hijabi_partner',
  wear_occasionally: 'irregular_hijabi_ok',
  never_wear: 'no_hijab_needed',
  intend_to_wear: 'intention_to_wear_hijab',
};

export function normalizeHijabPreference(
  value: string | null | undefined,
): HijabPreferenceValue | null {
  if (!value) return null;
  if ((HIJAB_PREFERENCE_VALUES as readonly string[]).includes(value)) {
    return value as HijabPreferenceValue;
  }
  return LEGACY_HIJAB_PREFERENCE_FROM_PRACTICE[value] ?? null;
}

export function getHijabPracticeRank(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const idx = HIJAB_PRACTICE_VALUES.indexOf(
    value as (typeof HIJAB_PRACTICE_VALUES)[number],
  );
  return idx >= 0 ? idx : null;
}

export function getHijabPreferenceRank(
  value: string | null | undefined,
): number | null {
  const normalized = normalizeHijabPreference(value);
  if (!normalized) return null;
  return HIJAB_PREFERENCE_VALUES.indexOf(normalized);
}

/**
 * Male partner hijab preference vs female hijab practice.
 * Ranks align at index 0–3; lower rank = stricter / more observant.
 */
export function matchesHijabPreference(
  preference: string | null | undefined,
  practice: string | null | undefined,
): boolean {
  const prefRank = getHijabPreferenceRank(preference);
  const practiceRank = getHijabPracticeRank(practice);
  if (prefRank == null || practiceRank == null) return false;

  if (prefRank === 0) return practiceRank === 0;
  if (prefRank === 1) return practiceRank <= 1;
  if (prefRank === 2) return true;
  // intention_to_wear_hijab: regular, occasional, or intending — not never-wear
  return practiceRank === 0 || practiceRank === 1 || practiceRank === 3;
}

export function showBeardPreferenceField(
  religion: string | null | undefined,
  gender: string | null | undefined,
): boolean {
  return isIslamReligion(religion) && gender === FEMALE_GENDER_VALUE;
}

export function showPrayerPreferenceField(
  religion: string | null | undefined,
): boolean {
  return isIslamReligion(religion);
}

export function showHijabPreferenceField(
  religion: string | null | undefined,
  gender: string | null | undefined,
): boolean {
  return isIslamReligion(religion) && gender === MALE_GENDER_VALUE;
}

export {
  FEMALE_GENDER_VALUE,
  ISLAM_RELIGION_VALUE,
  MALE_GENDER_VALUE,
  isIslamReligion,
};
