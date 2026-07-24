export function isDivorcedMaritalStatus(maritalStatus?: string | null): boolean {
  return maritalStatus === 'divorced';
}

export function isWidowedMaritalStatus(maritalStatus?: string | null): boolean {
  return maritalStatus === 'widowed';
}

export function requiresChildrenCountMaritalStatus(
  maritalStatus?: string | null,
): boolean {
  return (
    isDivorcedMaritalStatus(maritalStatus) ||
    isWidowedMaritalStatus(maritalStatus)
  );
}

export const CHILDREN_COUNT_MAX = 20;

/** Digits only, capped at {@link CHILDREN_COUNT_MAX}. */
export function sanitizeChildrenCountInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits === '') return '';
  return String(Math.min(Number(digits), CHILDREN_COUNT_MAX));
}
