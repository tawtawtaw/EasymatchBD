/** Max family guests each member may invite into one call. */
export const MAX_VIDEO_CALL_GUESTS_PER_SIDE = 2;

/** Guest invite link validity (hours). */
export const VIDEO_CALL_GUEST_INVITE_TTL_HOURS = 4;

export const VIDEO_CALL_GUEST_RELATIONS = [
  'father',
  'mother',
  'brother',
  'sister',
  'uncle',
  'aunt',
  'guardian',
  'other_relative',
] as const;

export type VideoCallGuestRelation =
  (typeof VIDEO_CALL_GUEST_RELATIONS)[number];
