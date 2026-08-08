import { apiRequest } from "./api/client";
import { dedupeRequest, invalidateDedupeCache } from "./api/dedupe";
import type { VideoCallAlertItem } from "../types/video-calls";

export type AlertsSummary = {
  unreadMessages: number;
  incomingInterests: number;
  outgoingInterests: number;
  connections: number;
  incomingCalls: number;
  incomingCallAlert: VideoCallAlertItem | null;
  callAlerts: VideoCallAlertItem[];
};

export async function getAlertsSummary(forceFresh = false) {
  if (forceFresh) {
    invalidateDedupeCache("alerts-summary");
  }
  return dedupeRequest(
    "alerts-summary",
    () => apiRequest<AlertsSummary>("/discovery/alerts-summary"),
    forceFresh ? 0 : 3_000,
  );
}

export async function registerPushToken(token: string, platform?: string) {
  return apiRequest<{ ok: boolean }>("/auth/me/push-tokens", {
    method: "POST",
    body: JSON.stringify({ token, platform }),
  });
}

export async function registerPushTokenViaDevice(
  deviceToken: string,
  phone: string,
  token: string,
  platform?: string,
) {
  return apiRequest<{ ok: boolean }>("/auth/device/push-token", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ deviceToken, phone, token, platform }),
  });
}

export async function removePushToken(token: string) {
  return apiRequest<{ ok: boolean }>("/auth/me/push-tokens/remove", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function getPushTokenStatus() {
  return apiRequest<{ registered: boolean; count: number }>(
    "/auth/me/push-tokens/status",
  );
}
