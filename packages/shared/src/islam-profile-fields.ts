export const HAS_BEARD_VALUES = ['yes', 'no', 'prefer_not_to_say'] as const;
export type HasBeardValue = (typeof HAS_BEARD_VALUES)[number];

export const PRAYER_PRACTICE_VALUES = [
  'five_times_regularly',
  'occasionally',
  'friday_only',
  'never',
  'prefer_not_to_say',
] as const;
export type PrayerPracticeValue = (typeof PRAYER_PRACTICE_VALUES)[number];

export const ISLAM_RELIGION_VALUE = 'islam';
export const MALE_GENDER_VALUE = 'male';
export const FEMALE_GENDER_VALUE = 'female';

export const HIJAB_PRACTICE_VALUES = [
  'wear_regularly',
  'wear_occasionally',
  'never_wear',
  'intend_to_wear',
] as const;
export type HijabPracticeValue = (typeof HIJAB_PRACTICE_VALUES)[number];

export function isIslamReligion(religion: string | null | undefined): boolean {
  return religion === ISLAM_RELIGION_VALUE;
}

export function showHasBeardField(
  religion: string | null | undefined,
  gender: string | null | undefined,
): boolean {
  return isIslamReligion(religion) && gender === MALE_GENDER_VALUE;
}

export function showHijabPracticeField(
  religion: string | null | undefined,
  gender: string | null | undefined,
): boolean {
  return isIslamReligion(religion) && gender === FEMALE_GENDER_VALUE;
}

export function getOppositeGender(
  gender: string | null | undefined,
): typeof MALE_GENDER_VALUE | typeof FEMALE_GENDER_VALUE | undefined {
  if (gender === MALE_GENDER_VALUE) return FEMALE_GENDER_VALUE;
  if (gender === FEMALE_GENDER_VALUE) return MALE_GENDER_VALUE;
  return undefined;
}

export function requiresPrayerPractice(
  religion: string | null | undefined,
): boolean {
  return isIslamReligion(religion);
}
