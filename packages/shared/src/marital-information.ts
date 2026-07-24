import {
  FEMALE_GENDER_VALUE,
  MALE_GENDER_VALUE,
} from './islam-profile-fields';

export const EXPECTED_MARRIAGE_TIMELINE_VALUES = [
  'one_year',
  'two_years',
  'as_soon_as_possible',
] as const;
export type ExpectedMarriageTimelineValue =
  (typeof EXPECTED_MARRIAGE_TIMELINE_VALUES)[number];

export const DOWRY_EXPECTATION_VALUES = [
  'yes',
  'no',
  'can_be_discussed',
  'prefer_not_to_share',
] as const;
export type DowryExpectationValue = (typeof DOWRY_EXPECTATION_VALUES)[number];

export const WEDDING_CEREMONY_PREFERENCE_VALUES = [
  'simple',
  'modest',
  'grand',
  'can_be_discussed_later',
] as const;
export type WeddingCeremonyPreferenceValue =
  (typeof WEDDING_CEREMONY_PREFERENCE_VALUES)[number];

export const EXPECTED_PARENTHOOD_TIMELINE_VALUES = [
  'within_one_year',
  'within_two_years',
  'within_three_four_years',
  'can_be_agreed_later',
] as const;
export type ExpectedParenthoodTimelineValue =
  (typeof EXPECTED_PARENTHOOD_TIMELINE_VALUES)[number];

export const LIVING_ARRANGEMENTS_MALE_VALUES = [
  'live_with_my_family',
  'live_away_from_my_family',
  'can_be_discussed_later',
  'live_with_family_2_3_years',
  'other_arrangements',
] as const;
export type LivingArrangementsMaleValue =
  (typeof LIVING_ARRANGEMENTS_MALE_VALUES)[number];

export const LIVING_ARRANGEMENTS_FEMALE_VALUES = [
  'dont_intend_live_with_in_laws',
  'intend_live_with_in_laws',
  'no_preference',
  'live_separately_after_2_3_years',
] as const;
export type LivingArrangementsFemaleValue =
  (typeof LIVING_ARRANGEMENTS_FEMALE_VALUES)[number];

export const LIVING_ARRANGEMENTS_OTHER_MALE_VALUE = 'other_arrangements';

/** Male choice → compatible female choice (when female has a specific preference). */
export const LIVING_ARRANGEMENTS_COMPATIBLE_PAIRS: Partial<
  Record<LivingArrangementsMaleValue, LivingArrangementsFemaleValue>
> = {
  live_with_my_family: 'intend_live_with_in_laws',
  live_away_from_my_family: 'dont_intend_live_with_in_laws',
  live_with_family_2_3_years: 'live_separately_after_2_3_years',
};

export function livingArrangementsCompatible(
  maleValue: string | null | undefined,
  femaleValue: string | null | undefined,
): boolean {
  const male = maleValue?.trim() || null;
  const female = femaleValue?.trim() || null;
  if (!male || !female) return false;
  if (female === 'no_preference') return true;
  const expectedFemale =
    LIVING_ARRANGEMENTS_COMPATIBLE_PAIRS[
      male as LivingArrangementsMaleValue
    ];
  return expectedFemale != null && female === expectedFemale;
}

export const EXPECTED_KABIN_AMOUNT_BDT_MIN = 0;
export const EXPECTED_KABIN_AMOUNT_BDT_MAX = 10_000_000;

export function isValidExpectedKabinAmountBdt(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= EXPECTED_KABIN_AMOUNT_BDT_MIN &&
    value <= EXPECTED_KABIN_AMOUNT_BDT_MAX
  );
}

export function isExpectedKabinAmountInputValid(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) return false;
  return isValidExpectedKabinAmountBdt(parsed);
}

export function parseExpectedKabinAmountInput(
  value: string,
): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) return undefined;
  if (!isValidExpectedKabinAmountBdt(parsed)) return undefined;
  return parsed;
}

export function isValidExpectedKabinAmountRange(
  min: number | null | undefined,
  max: number | null | undefined,
): boolean {
  if (min != null && !isValidExpectedKabinAmountBdt(min)) return false;
  if (max != null && !isValidExpectedKabinAmountBdt(max)) return false;
  if (min != null && max != null && min > max) return false;
  return true;
}

export function formatExpectedKabinAmountRangeBdt(
  min: number | null | undefined,
  max: number | null | undefined,
  locale = 'en',
): string | null {
  if (min == null && max == null) return null;
  const low = min ?? max!;
  const high = max ?? min!;
  const formatter = new Intl.NumberFormat(locale);
  if (low === high) return `${formatter.format(low)} BDT`;
  return `${formatter.format(Math.min(low, high))} – ${formatter.format(Math.max(low, high))} BDT`;
}

export function showDowryExpectationField(
  gender: string | null | undefined,
): boolean {
  return gender === MALE_GENDER_VALUE;
}

export function showLivingArrangementsOtherField(
  gender: string | null | undefined,
  livingArrangements: string | null | undefined,
): boolean {
  return (
    gender === MALE_GENDER_VALUE &&
    livingArrangements === LIVING_ARRANGEMENTS_OTHER_MALE_VALUE
  );
}

export function getLivingArrangementsDropdownCategory(
  gender: string | null | undefined,
): 'living_arrangements_male' | 'living_arrangements_female' | null {
  if (gender === MALE_GENDER_VALUE) return 'living_arrangements_male';
  if (gender === FEMALE_GENDER_VALUE) return 'living_arrangements_female';
  return null;
}

export function getLivingArrangementsValues(
  gender: string | null | undefined,
): readonly string[] {
  if (gender === MALE_GENDER_VALUE) return LIVING_ARRANGEMENTS_MALE_VALUES;
  if (gender === FEMALE_GENDER_VALUE) return LIVING_ARRANGEMENTS_FEMALE_VALUES;
  return [];
}

export function isValidLivingArrangementsForGender(
  gender: string | null | undefined,
  value: string,
): boolean {
  return getLivingArrangementsValues(gender).includes(value);
}
