import { canJoinScheduledVideoCall } from "@easymatch/shared";
import { apiRequest } from "./api/client";
import { dedupeRequest, invalidateDedupeCache } from "./api/dedupe";
import type {
  VideoCallAlertItem,
  VideoCallItem,
} from "../types/video-calls";

export async function listVideoCallAlerts() {
  return dedupeRequest(
    "video-call-alerts",
    () => apiRequest<VideoCallAlertItem[]>("/discovery/calls/alerts"),
    10_000,
  );
}

export async function listConnectionVideoCalls(
  connectionId: string,
  options?: { activeOnly?: boolean },
) {
  const query = options?.activeOnly ? "?activeOnly=1" : "";
  return dedupeRequest(
    `video-calls:${connectionId}:${options?.activeOnly ? "active" : "all"}`,
    () =>
      apiRequest<VideoCallItem[]>(
        `/discovery/calls/${encodeURIComponent(connectionId)}${query}`,
      ),
    3_000,
  );
}

export async function createVideoCall(
  connectionId: string,
  scheduledAt?: string | null,
) {
  const result = await apiRequest<VideoCallItem>(
    `/discovery/calls/${encodeURIComponent(connectionId)}`,
    {
      method: "POST",
      body: JSON.stringify(
        scheduledAt ? { scheduledAt } : { scheduledAt: null },
      ),
    },
  );
  invalidateDedupeCache("video-call-alerts");
  invalidateDedupeCache("alerts-summary");
  return result;
}

export async function acceptVideoCall(callId: string) {
  return apiRequest<VideoCallItem>(
    `/discovery/calls/${encodeURIComponent(callId)}/accept`,
    { method: "POST" },
  );
}

export async function declineVideoCall(callId: string) {
  return apiRequest<VideoCallItem>(
    `/discovery/calls/${encodeURIComponent(callId)}/decline`,
    { method: "POST" },
  );
}

export async function cancelVideoCall(callId: string) {
  return apiRequest<VideoCallItem>(
    `/discovery/calls/${encodeURIComponent(callId)}/cancel`,
    { method: "POST" },
  );
}

export async function rescheduleVideoCall(callId: string, scheduledAt: string) {
  return apiRequest<VideoCallItem>(
    `/discovery/calls/${encodeURIComponent(callId)}/reschedule`,
    {
      method: "POST",
      body: JSON.stringify({ scheduledAt }),
    },
  );
}

export async function startScheduledVideoCall(callId: string) {
  return apiRequest<VideoCallItem>(
    `/discovery/calls/${encodeURIComponent(callId)}/start`,
    { method: "POST" },
  );
}

export async function endVideoCall(callId: string) {
  const result = await apiRequest<VideoCallItem>(
    `/discovery/calls/${encodeURIComponent(callId)}/end`,
    { method: "POST" },
  );
  invalidateDedupeCache("video-call-alerts");
  invalidateDedupeCache("alerts-summary");
  return result;
}

export function canJoinScheduledCall(scheduledAt: string): boolean {
  return canJoinScheduledVideoCall(scheduledAt);
}
