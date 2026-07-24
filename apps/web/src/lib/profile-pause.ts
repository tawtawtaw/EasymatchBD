import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
import { invalidateDedupeCache } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function clientApiUrl(): string {
  return typeof window !== "undefined" ? getApiBaseUrl() : (API_URL ?? "");
}

export type ProfilePauseStatus = {
  isPaused: boolean;
  pausedAt: string | null;
};

export const PROFILE_ACCOUNT_STATUS_SECTION_ID = "profile-account-status";

export const PROFILE_ACCOUNT_STATUS_HREF = `/profile#${PROFILE_ACCOUNT_STATUS_SECTION_ID}`;

export function scrollToProfileAccountStatus() {
  document.getElementById(PROFILE_ACCOUNT_STATUS_SECTION_ID)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

async function parseResponse<T>(res: Response): Promise<T> {
  return readJsonResponse<T>(res);
}

export async function pauseMyProfile(token: string): Promise<ProfilePauseStatus> {
  const res = await apiFetch(`${clientApiUrl()}/profiles/me/pause`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  invalidateDedupeCache("auth:session");
  return parseResponse<ProfilePauseStatus>(res);
}

export async function reactivateMyProfile(
  token: string,
): Promise<ProfilePauseStatus> {
  const res = await apiFetch(`${clientApiUrl()}/profiles/me/reactivate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  invalidateDedupeCache("auth:session");
  return parseResponse<ProfilePauseStatus>(res);
}

export async function getMyPauseStatus(token: string): Promise<ProfilePauseStatus> {
  const res = await apiFetch(`${clientApiUrl()}/profiles/me/pause-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse<ProfilePauseStatus>(res);
}
