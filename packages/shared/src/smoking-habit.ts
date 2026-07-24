import { MALE_GENDER_VALUE } from './islam-profile-fields';

export const SMOKING_HABIT_VALUES = [
  'yes',
  'no',
  'prefer_not_to_share',
] as const;
export type SmokingHabitValue = (typeof SMOKING_HABIT_VALUES)[number];

export function showSmokingHabitField(
  gender: string | null | undefined,
): boolean {
  return gender === MALE_GENDER_VALUE;
}

export function requiresSmokingHabit(
  gender: string | null | undefined,
): boolean {
  return showSmokingHabitField(gender);
}
