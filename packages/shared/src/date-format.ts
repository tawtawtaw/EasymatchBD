export const DISPLAY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export const DISPLAY_DATE_MAX_LENGTH = 10;

/** Formats typed digits as DD/MM/YYYY, inserting slashes automatically. */
export function formatDisplayDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isValidDisplayDate(value: string): boolean {
  const trimmed = value.trim();
  const match = trimmed.match(DISPLAY_DATE_PATTERN);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso;
}

export function displayDateToIso(value: string): string | null {
  if (!isValidDisplayDate(value)) return null;
  const [, dd, mm, yyyy] = value.trim().match(DISPLAY_DATE_PATTERN)!;
  return `${yyyy}-${mm}-${dd}`;
}

export function isoDateToDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const trimmed = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return '';
  const [yyyy, mm, dd] = trimmed.split('-');
  return `${dd}/${mm}/${yyyy}`;
}
