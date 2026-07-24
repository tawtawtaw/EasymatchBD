/** Eight-digit public profile identifier (first digit 1–9). */
export const PROFILE_CODE_LENGTH = 8;

export const PROFILE_CODE_PATTERN = /^[1-9]\d{7}$/;

export function normalizeProfileCode(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

export function isValidProfileCode(value: string): boolean {
  return PROFILE_CODE_PATTERN.test(normalizeProfileCode(value));
}

export function formatProfileCode(value: string): string {
  return normalizeProfileCode(value);
}
