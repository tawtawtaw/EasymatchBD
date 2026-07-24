import { apiRequest } from "./api/client";
import { invalidateDedupeCache } from "./api/dedupe";

export type ProfilePauseStatus = {
  isPaused: boolean;
  pausedAt: string | null;
};

export async function pauseMyProfile(): Promise<ProfilePauseStatus> {
  const result = await apiRequest<ProfilePauseStatus>("/profiles/me/pause", {
    method: "POST",
  });
  invalidateDedupeCache("auth:session");
  return result;
}

export async function reactivateMyProfile(): Promise<ProfilePauseStatus> {
  const result = await apiRequest<ProfilePauseStatus>("/profiles/me/reactivate", {
    method: "POST",
  });
  invalidateDedupeCache("auth:session");
  return result;
}

export async function getMyPauseStatus(): Promise<ProfilePauseStatus> {
  return apiRequest<ProfilePauseStatus>("/profiles/me/pause-status");
}
