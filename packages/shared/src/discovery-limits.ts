export const DISCOVERY_DEFAULT_PROFILE_LIMIT = 20;

export const PUBLIC_BROWSE_DEFAULT_LIMIT = 24;

export const PUBLIC_BROWSE_MAX_LIMIT = 60;

export const DISCOVERY_MAX_PROFILE_LIMIT = 100;

/** Max profiles loaded from DB before in-memory compatibility sort. */
export const DISCOVERY_CANDIDATE_POOL_LIMIT = 120;

/** Smaller pool for home-page suggestion cards (compatibility sort still in-memory). */
export const DISCOVERY_HOME_SUGGESTION_POOL_LIMIT = 15;

export const DISCOVERY_PROFILE_LIMIT_OPTIONS = [
  20, 40, 60, 80, 100,
] as const;

export type DiscoveryProfileLimitOption =
  (typeof DISCOVERY_PROFILE_LIMIT_OPTIONS)[number];

export function clampDiscoveryProfileLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return DISCOVERY_DEFAULT_PROFILE_LIMIT;
  }
  return Math.min(
    Math.max(Math.trunc(limit), 1),
    DISCOVERY_MAX_PROFILE_LIMIT,
  );
}

export function clampPublicBrowseLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return PUBLIC_BROWSE_DEFAULT_LIMIT;
  }
  return Math.min(
    Math.max(Math.trunc(limit), 1),
    PUBLIC_BROWSE_MAX_LIMIT,
  );
}
