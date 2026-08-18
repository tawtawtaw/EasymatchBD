/** Join opens 15 minutes before the scheduled time. */
export const VIDEO_CALL_JOIN_WINDOW_MS = 15 * 60 * 1000;

/** Reminder banner starts 60 minutes before the scheduled time. */
export const VIDEO_CALL_REMINDER_WINDOW_MS = 60 * 60 * 1000;

/** After the scheduled time, members may still join for this long. */
export const VIDEO_CALL_OVERDUE_GRACE_MS = 60 * 60 * 1000;

/** Loop the call ringtone from the scheduled instant for this long unless joined or silenced. */
export const VIDEO_CALL_SCHEDULED_RING_MS = 2 * 60 * 1000;

function scheduledAtMs(scheduledAt: Date | string): number {
  return scheduledAt instanceof Date
    ? scheduledAt.getTime()
    : new Date(scheduledAt).getTime();
}

export function isInVideoCallJoinWindow(
  scheduledAt: Date | string,
  now = Date.now(),
): boolean {
  const at =
    scheduledAt instanceof Date
      ? scheduledAt.getTime()
      : new Date(scheduledAt).getTime();
  if (Number.isNaN(at)) return false;
  return now >= at - VIDEO_CALL_JOIN_WINDOW_MS;
}

export function isInVideoCallOverdueGrace(
  scheduledAt: Date | string,
  now = Date.now(),
): boolean {
  const at =
    scheduledAt instanceof Date
      ? scheduledAt.getTime()
      : new Date(scheduledAt).getTime();
  if (Number.isNaN(at)) return false;
  return now >= at && now <= at + VIDEO_CALL_OVERDUE_GRACE_MS;
}

export function canJoinScheduledVideoCall(
  scheduledAt: Date | string,
  now = Date.now(),
): boolean {
  const at =
    scheduledAt instanceof Date
      ? scheduledAt.getTime()
      : new Date(scheduledAt).getTime();
  if (Number.isNaN(at)) return false;
  if (now > at + VIDEO_CALL_OVERDUE_GRACE_MS) return false;
  return isInVideoCallJoinWindow(scheduledAt, now) || isInVideoCallOverdueGrace(scheduledAt, now);
}

export function shouldRingScheduledVideoCall(
  scheduledAt: Date | string,
  now = Date.now(),
): boolean {
  const at = scheduledAtMs(scheduledAt);
  if (Number.isNaN(at)) return false;
  return now >= at && now < at + VIDEO_CALL_SCHEDULED_RING_MS;
}

/** Milliseconds until the scheduled ringtone should start, or null if it should not be armed. */
export function msUntilScheduledCallRing(
  scheduledAt: Date | string,
  now = Date.now(),
): number | null {
  const at = scheduledAtMs(scheduledAt);
  if (Number.isNaN(at) || now >= at) return null;
  return at - now;
}

export function isInVideoCallReminderWindow(
  scheduledAt: Date | string,
  now = Date.now(),
): boolean {
  const at =
    scheduledAt instanceof Date
      ? scheduledAt.getTime()
      : new Date(scheduledAt).getTime();
  if (Number.isNaN(at)) return false;
  const reminderStart = at - VIDEO_CALL_REMINDER_WINDOW_MS;
  const joinStart = at - VIDEO_CALL_JOIN_WINDOW_MS;
  return now >= reminderStart && now < joinStart;
}
