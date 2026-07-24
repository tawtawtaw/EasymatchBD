import {
  canJoinScheduledVideoCall,
  EASYMATCH_API_URL,
  VIDEO_CALL_JOIN_WINDOW_MS,
  VIDEO_CALL_OVERDUE_GRACE_MS,
  VIDEO_CALL_REMINDER_WINDOW_MS,
} from "@easymatch/shared";
import { dedupeRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

function apiUrl(): string {
  return typeof window !== "undefined" ? getApiBaseUrl() : API_URL;
}

async function parseResponse<T>(res: Response): Promise<T> {
  return readJsonResponse<T>(res);
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export type VideoCallStatus =
  | "scheduled"
  | "ringing"
  | "active"
  | "completed"
  | "cancelled"
  | "declined"
  | "missed";

export type VideoCallItem = {
  id: string;
  connectionId: string;
  initiatorId: string;
  isInitiator: boolean;
  scheduledAt: string | null;
  status: VideoCallStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  consultantEngagementId?: string | null;
};

export type VideoCallSignal = {
  id: string;
  type: "offer" | "answer" | "ice";
  senderId: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type VideoCallAlertKind =
  | "incoming"
  | "scheduled_partner"
  | "scheduled_reminder"
  | "scheduled_starting";

export type VideoCallAlertItem = {
  kind: VideoCallAlertKind;
  call: VideoCallItem;
  partnerName: string | null;
};

export async function listIncomingVideoCalls(
  token: string,
): Promise<VideoCallItem[]> {
  const res = await apiFetch(`${apiUrl()}/discovery/calls/incoming`, {
    headers: authHeaders(token),
  });
  return parseResponse<VideoCallItem[]>(res);
}

export async function listVideoCallAlerts(
  token: string,
): Promise<VideoCallAlertItem[]> {
  return dedupeRequest(
    "video-call-alerts",
    async () => {
      const res = await apiFetch(`${apiUrl()}/discovery/calls/alerts`, {
        headers: authHeaders(token),
      });
      return parseResponse<VideoCallAlertItem[]>(res);
    },
    10_000,
  );
}

export async function getVideoCall(
  token: string,
  callId: string,
): Promise<VideoCallItem> {
  return dedupeRequest(
    `video-call:${callId}`,
    async () => {
      const res = await apiFetch(`${apiUrl()}/discovery/calls/item/${callId}`, {
        headers: authHeaders(token),
      });
      return parseResponse<VideoCallItem>(res);
    },
    10_000,
  );
}

export async function listConnectionVideoCalls(
  token: string,
  connectionId: string,
  options?: { activeOnly?: boolean },
): Promise<VideoCallItem[]> {
  const query = options?.activeOnly ? "?activeOnly=1" : "";
  return dedupeRequest(
    `video-calls:${connectionId}:${options?.activeOnly ? "active" : "all"}`,
    async () => {
      const res = await apiFetch(
        `${apiUrl()}/discovery/calls/${connectionId}${query}`,
        { headers: authHeaders(token) },
      );
      return parseResponse<VideoCallItem[]>(res);
    },
    3_000,
  );
}

export async function createVideoCall(
  token: string,
  connectionId: string,
  scheduledAt?: string | null,
): Promise<VideoCallItem> {
  const res = await apiFetch(`${apiUrl()}/discovery/calls/${connectionId}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(
      scheduledAt ? { scheduledAt } : { scheduledAt: null },
    ),
  });
  return parseResponse<VideoCallItem>(res);
}

export async function acceptVideoCall(
  token: string,
  callId: string,
): Promise<VideoCallItem> {
  const res = await apiFetch(`${apiUrl()}/discovery/calls/${callId}/accept`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<VideoCallItem>(res);
}

export async function declineVideoCall(
  token: string,
  callId: string,
): Promise<VideoCallItem> {
  const res = await apiFetch(`${apiUrl()}/discovery/calls/${callId}/decline`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<VideoCallItem>(res);
}

export async function cancelVideoCall(
  token: string,
  callId: string,
): Promise<VideoCallItem> {
  const res = await apiFetch(`${apiUrl()}/discovery/calls/${callId}/cancel`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<VideoCallItem>(res);
}

export async function rescheduleVideoCall(
  token: string,
  callId: string,
  scheduledAt: string,
): Promise<VideoCallItem> {
  const res = await apiFetch(`${apiUrl()}/discovery/calls/${callId}/reschedule`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ scheduledAt }),
  });
  return parseResponse<VideoCallItem>(res);
}

export async function startScheduledVideoCall(
  token: string,
  callId: string,
): Promise<VideoCallItem> {
  const res = await apiFetch(`${apiUrl()}/discovery/calls/${callId}/start`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<VideoCallItem>(res);
}

export async function endVideoCall(
  token: string,
  callId: string,
): Promise<VideoCallItem> {
  const res = await apiFetch(`${apiUrl()}/discovery/calls/${callId}/end`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<VideoCallItem>(res);
}

export async function postVideoCallSignal(
  token: string,
  callId: string,
  type: "offer" | "answer" | "ice",
  payload: Record<string, unknown>,
) {
  const res = await apiFetch(`${apiUrl()}/discovery/calls/${callId}/signals`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ type, payload }),
  });
  return parseResponse<{ id: string; type: string; createdAt: string }>(res);
}

export async function pollVideoCallSignals(
  token: string,
  callId: string,
  after?: string,
): Promise<VideoCallSignal[]> {
  const params = after ? `?after=${encodeURIComponent(after)}` : "";
  const res = await apiFetch(
    `${apiUrl()}/discovery/calls/${callId}/signals${params}`,
    { headers: authHeaders(token) },
  );
  return parseResponse<VideoCallSignal[]>(res);
}

export {
  VIDEO_CALL_JOIN_WINDOW_MS,
  VIDEO_CALL_OVERDUE_GRACE_MS,
  VIDEO_CALL_REMINDER_WINDOW_MS,
};

export function canJoinScheduledCall(scheduledAt: string): boolean {
  return canJoinScheduledVideoCall(scheduledAt);
}

export async function getLiveKitStatus(
  token: string,
): Promise<{ configured: boolean }> {
  return dedupeRequest(
    "livekit-status",
    async () => {
      const res = await apiFetch(`${apiUrl()}/discovery/calls/livekit-status`, {
        headers: authHeaders(token),
      });
      return parseResponse<{ configured: boolean }>(res);
    },
    300_000,
  );
}

export const WEBRTC_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

export function formatVideoCallWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
