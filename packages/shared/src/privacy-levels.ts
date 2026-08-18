export const PrivacyLevel = {
  PUBLIC: 0,
  BASIC_MUTUAL_INTEREST: 1,
  PROFILE_COMPATIBILITY: 2,
  SERIOUS_CONSIDERATION: 3,
} as const;

export type PrivacyLevel =
  (typeof PrivacyLevel)[keyof typeof PrivacyLevel];

export const MIN_VIDEO_CALL_PRIVACY_LEVEL = PrivacyLevel.PROFILE_COMPATIBILITY;

/** Marriage consultant services unlock at profile compatibility (level 2). */
export const MIN_CONSULTANT_PRIVACY_LEVEL = PrivacyLevel.PROFILE_COMPATIBILITY;

/** Anonymous public biodata browse shows level-0 fields only (public discovery). */
export const PUBLIC_BROWSE_PRIVACY_LEVEL = PrivacyLevel.PUBLIC;

/** Days after ending a connection before either member can send interest again. */
export const CONNECTION_RECONNECT_COOLDOWN_DAYS = 7;

export const PRIVACY_LEVEL_LABELS: Record<PrivacyLevel, string> = {
  [PrivacyLevel.PUBLIC]: 'Public Discovery',
  [PrivacyLevel.BASIC_MUTUAL_INTEREST]: 'Basic Mutual Interest',
  [PrivacyLevel.PROFILE_COMPATIBILITY]: 'Profile Compatibility',
  [PrivacyLevel.SERIOUS_CONSIDERATION]: 'Serious Marriage Consideration',
};
