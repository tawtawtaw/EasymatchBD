import { EASYMATCH_API_URL } from "@easymatch/shared";
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

export type VideoCallGuestStatus =
  | "pending_approval"
  | "approved"
  | "declined"
  | "joined"
  | "left"
  | "expired";

export type VideoCallGuestItem = {
  id: string;
  videoCallId: string;
  invitedById: string;
  guestName: string;
  relation: string | null;
  status: VideoCallGuestStatus;
  approvedByUserLow: boolean;
  approvedByUserHigh: boolean;
  joinedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  inviteUrl?: string;
  canRevoke?: boolean;
  needsMyApproval?: boolean;
};

export type LiveKitSession =
  | { configured: false }
  | {
      configured: true;
      url: string;
      token: string;
      roomName: string;
    };

export type GuestLobby = {
  guestName: string;
  relation: string | null;
  status: VideoCallGuestStatus;
  callStatus: string;
  livekitConfigured: boolean;
  approvedByUserLow: boolean;
  approvedByUserHigh: boolean;
  expiresAt: string;
};

export async function getMemberLiveKitToken(
  token: string,
  callId: string,
): Promise<LiveKitSession> {
  const res = await apiFetch(
    `${apiUrl()}/discovery/calls/${callId}/livekit-token`,
    { headers: authHeaders(token) },
  );
  return parseResponse<LiveKitSession>(res);
}

export async function listVideoCallGuests(
  token: string,
  callId: string,
): Promise<VideoCallGuestItem[]> {
  return dedupeRequest(
    `video-call-guests:${callId}`,
    async () => {
      const res = await apiFetch(`${apiUrl()}/discovery/calls/${callId}/guests`, {
        headers: authHeaders(token),
      });
      return parseResponse<VideoCallGuestItem[]>(res);
    },
    10_000,
  );
}

export async function inviteVideoCallGuest(
  token: string,
  callId: string,
  guestName: string,
  relation?: string,
): Promise<VideoCallGuestItem> {
  const res = await apiFetch(`${apiUrl()}/discovery/calls/${callId}/guests`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ guestName, relation }),
  });
  return parseResponse<VideoCallGuestItem>(res);
}

export async function approveVideoCallGuest(
  token: string,
  callId: string,
  guestId: string,
): Promise<VideoCallGuestItem> {
  const res = await apiFetch(
    `${apiUrl()}/discovery/calls/${callId}/guests/${guestId}/approve`,
    { method: "POST", headers: authHeaders(token) },
  );
  return parseResponse<VideoCallGuestItem>(res);
}

export async function declineVideoCallGuest(
  token: string,
  callId: string,
  guestId: string,
): Promise<VideoCallGuestItem> {
  const res = await apiFetch(
    `${apiUrl()}/discovery/calls/${callId}/guests/${guestId}/decline`,
    { method: "POST", headers: authHeaders(token) },
  );
  return parseResponse<VideoCallGuestItem>(res);
}

export async function revokeVideoCallGuest(
  token: string,
  callId: string,
  guestId: string,
): Promise<VideoCallGuestItem> {
  const res = await apiFetch(
    `${apiUrl()}/discovery/calls/${callId}/guests/${guestId}`,
    { method: "DELETE", headers: authHeaders(token) },
  );
  return parseResponse<VideoCallGuestItem>(res);
}

export async function fetchGuestLobby(token: string): Promise<GuestLobby> {
  const res = await apiFetch(`${apiUrl()}/video-calls/guest/${token}`);
  return parseResponse<GuestLobby>(res);
}

export async function joinGuestVideoCall(token: string): Promise<{
  url: string;
  token: string;
  roomName: string;
  guestName: string;
}> {
  const res = await apiFetch(`${apiUrl()}/video-calls/guest/${token}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return parseResponse(res);
}
