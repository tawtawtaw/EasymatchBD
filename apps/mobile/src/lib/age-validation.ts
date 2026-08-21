import {
  LEGAL_MARRIAGE_AGE_FEMALE,
  PROFILE_AGE_MAX,
} from "@easymatch/shared";

const AGE_REGEX = /^\d+$/;

export function getAgeInputError(
  value: string,
  messages: { invalid: string; range: string },
  bounds?: { min?: number; max?: number },
): string | null {
  if (value === "") return null;
  if (!AGE_REGEX.test(value)) return messages.invalid;
  const age = Number(value);
  const min = bounds?.min ?? LEGAL_MARRIAGE_AGE_FEMALE;
  const max = bounds?.max ?? PROFILE_AGE_MAX;
  if (age < min || age > max) return messages.range;
  return null;
}

export function isAgeInputValid(
  value: string,
  bounds?: { min?: number; max?: number },
): boolean {
  return getAgeInputError(value, { invalid: "x", range: "x" }, bounds) === null;
}
