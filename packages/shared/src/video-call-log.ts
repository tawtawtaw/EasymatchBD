export const VIDEO_CALL_CLOSED_STATUSES = [
  "completed",
  "cancelled",
  "declined",
  "missed",
] as const;

export type VideoCallClosedStatus = (typeof VIDEO_CALL_CLOSED_STATUSES)[number];

export function isClosedVideoCallStatus(
  status: string,
): status is VideoCallClosedStatus {
  return (VIDEO_CALL_CLOSED_STATUSES as readonly string[]).includes(status);
}

export function isHighlightedMissedCall(status: string): boolean {
  return status === "missed" || status === "declined";
}

export function videoCallOccurredAt(call: {
  endedAt?: string | null;
  startedAt?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
}): string {
  return call.endedAt ?? call.startedAt ?? call.scheduledAt ?? call.createdAt;
}

export function videoCallDurationSeconds(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
): number | null {
  if (!startedAt || !endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / 1000);
}

/** WhatsApp-style duration, e.g. 0:12, 4:05, 1:02:09 */
export function formatVideoCallDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatVideoCallLogWhen(
  iso: string,
  locale: string,
  yesterdayLabel: string,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86_400_000,
  );

  if (diffDays === 0) {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  if (diffDays === 1) return yesterdayLabel;
  if (diffDays > 1 && diffDays < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function videoCallLogTitleKey(
  status: string,
): "videoCall" | "missed" | "declined" | "cancelled" {
  if (status === "missed") return "missed";
  if (status === "declined") return "declined";
  if (status === "cancelled") return "cancelled";
  return "videoCall";
}
