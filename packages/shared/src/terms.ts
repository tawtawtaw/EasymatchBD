/** Initial seed version when the database has no published terms yet. */
export const DEFAULT_TERMS_VERSION = '2026-06-11';

/** @deprecated Use the published version from the API / database. */
export const CURRENT_TERMS_VERSION = DEFAULT_TERMS_VERSION;

export function hasAcceptedCurrentTerms(
  termsAcceptedAt: Date | string | null | undefined,
  termsVersion: string | null | undefined,
  currentVersion: string,
): boolean {
  if (!termsAcceptedAt || !termsVersion) return false;
  return termsVersion === currentVersion;
}
