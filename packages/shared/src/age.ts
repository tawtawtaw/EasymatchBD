import {
  FEMALE_GENDER_VALUE,
  MALE_GENDER_VALUE,
} from './islam-profile-fields';

/** Bangladesh Child Marriage Restraint Act: minimum age for women. */
export const LEGAL_MARRIAGE_AGE_FEMALE = 18;

/** Bangladesh Child Marriage Restraint Act: minimum age for men. */
export const LEGAL_MARRIAGE_AGE_MALE = 21;

export const PROFILE_AGE_MAX = 80;

export function ageFromDateOfBirth(
  dateOfBirth: Date | string,
): number | null {
  const birth =
    typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
}

export function minMarriageAgeForGender(
  gender: string | null | undefined,
): number {
  if (gender === MALE_GENDER_VALUE) return LEGAL_MARRIAGE_AGE_MALE;
  return LEGAL_MARRIAGE_AGE_FEMALE;
}

/** Partner preference applies to the opposite gender. */
export function minMarriageAgeForPartnerPreference(
  memberGender: string | null | undefined,
): number {
  if (memberGender === MALE_GENDER_VALUE) return LEGAL_MARRIAGE_AGE_FEMALE;
  if (memberGender === FEMALE_GENDER_VALUE) return LEGAL_MARRIAGE_AGE_MALE;
  return LEGAL_MARRIAGE_AGE_FEMALE;
}

export type MemberAgeError = 'invalid' | 'too_young' | 'too_old';

export function memberAgeError(
  dateOfBirth: Date | string,
  gender: string | null | undefined,
): MemberAgeError | null {
  const age = ageFromDateOfBirth(dateOfBirth);
  if (age == null || age < 0) return 'invalid';
  if (age > PROFILE_AGE_MAX) return 'too_old';
  if (age < minMarriageAgeForGender(gender)) return 'too_young';
  return null;
}

export function isValidPreferenceAge(
  age: number,
  memberGender: string | null | undefined,
): boolean {
  return (
    Number.isInteger(age) &&
    age >= minMarriageAgeForPartnerPreference(memberGender) &&
    age <= PROFILE_AGE_MAX
  );
}
