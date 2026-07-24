const AGE_REGEX = /^\d+$/;
export const AGE_MIN = 18;
export const AGE_MAX = 80;

export function getAgeInputError(
  value: string,
  messages: { invalid: string; range: string },
): string | null {
  if (value === "") return null;
  if (!AGE_REGEX.test(value)) return messages.invalid;
  const age = Number(value);
  if (age < AGE_MIN || age > AGE_MAX) return messages.range;
  return null;
}

export function isAgeInputValid(value: string): boolean {
  return getAgeInputError(value, { invalid: "x", range: "x" }) === null;
}
