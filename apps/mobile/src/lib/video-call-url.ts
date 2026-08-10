import { config } from "../config/env";
import type { AppLocale } from "./locale";

type VideoCallPageOptions = {
  autoJoin?: boolean;
  memberName?: string;
  nativeShell?: boolean;
};

export function videoCallPageUrl(
  locale: AppLocale,
  connectionId: string,
  callId: string,
  options?: VideoCallPageOptions,
): string {
  const base = config.videoCallWebBaseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    connectionId,
    callId,
    from: "mobile",
    nativeShell: "1",
  });
  if (options?.autoJoin) {
    params.set("autoJoin", "1");
  }
  if (options?.memberName?.trim()) {
    params.set("memberName", options.memberName.trim());
  }
  // Opt-in only: set EXPO_PUBLIC_VIDEO_CALL_DEBUG=1 to show the call diagnostics.
  if (__DEV__ && process.env.EXPO_PUBLIC_VIDEO_CALL_DEBUG === "1") {
    params.set("debug", "1");
  }
  return `${base}/${locale}/mobile/video-call?${params.toString()}`;
}

export function formatVideoCallWhen(iso: string, locale: AppLocale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
