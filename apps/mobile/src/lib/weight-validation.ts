const WEIGHT_REGEX = /^\d+$/;
export const WEIGHT_MIN_KG = 30;
export const WEIGHT_MAX_KG = 200;

export function getWeightInputError(
  value: string,
  messages: { invalid: string; range: string },
): string | null {
  if (value === "") return null;
  if (!WEIGHT_REGEX.test(value)) return messages.invalid;
  const weight = Number(value);
  if (weight < WEIGHT_MIN_KG || weight > WEIGHT_MAX_KG) return messages.range;
  return null;
}

export function isWeightInputValid(value: string): boolean {
  return getWeightInputError(value, { invalid: "x", range: "x" }) === null;
}
