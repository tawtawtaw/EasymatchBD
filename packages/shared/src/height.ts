export const HeightUnit = {
  CM: 'cm',
  FT_IN: 'ft_in',
} as const;

export type HeightUnit = (typeof HeightUnit)[keyof typeof HeightUnit];

export const CM_HEIGHT_MIN = 120;
export const CM_HEIGHT_MAX = 220;
export const FEET_MIN = 4;
export const FEET_MAX = 7;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54);
}

export function getCmHeightOptions(): number[] {
  return Array.from(
    { length: CM_HEIGHT_MAX - CM_HEIGHT_MIN + 1 },
    (_, i) => CM_HEIGHT_MIN + i,
  );
}

export function getFeetOptions(): number[] {
  return Array.from(
    { length: FEET_MAX - FEET_MIN + 1 },
    (_, i) => FEET_MIN + i,
  );
}

export function getInchesOptions(): number[] {
  return Array.from({ length: 12 }, (_, i) => i);
}

export function formatFeetInches(feet: number, inches: number): string {
  return `${feet}' ${inches}"`;
}

export function formatHeightFromCm(cm: number | null | undefined): string | null {
  if (cm == null) return null;
  const { feet, inches } = cmToFeetInches(cm);
  return formatFeetInches(feet, inches);
}

export function formatHeightRangeFromCm(
  minCm: number | null | undefined,
  maxCm: number | null | undefined,
): string | null {
  const min = formatHeightFromCm(minCm);
  const max = formatHeightFromCm(maxCm);
  if (min && max) return `${min} – ${max}`;
  if (min) return `${min}+`;
  if (max) return `Up to ${max}`;
  return null;
}
