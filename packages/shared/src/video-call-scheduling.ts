/** Join opens 15 minutes before the scheduled time. */
export const VIDEO_CALL_JOIN_WINDOW_MS = 15 * 60 * 1000;

/** Reminder banner starts 60 minutes before the scheduled time. */
export const VIDEO_CALL_REMINDER_WINDOW_MS = 60 * 60 * 1000;

/** After the scheduled time, members may still join for this long. */
export const VIDEO_CALL_OVERDUE_GRACE_MS = 60 * 60 * 1000;

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
