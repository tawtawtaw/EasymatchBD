import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
import type { VerificationSubmission } from "@/lib/verification";

function authHeaders(token: string, json = true) {
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export async function createStaffAssistedProfile(
  token: string,
  input: { phone: string; consentNote: string; consentChannel?: string },
) {
  const res = await apiFetch(`${getApiBaseUrl()}/verification/staff-assisted`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return readJsonResponse<VerificationSubmission>(res);
}

async function putStaffAssistedSection(
  token: string,
  profileId: string,
  section: "personal" | "family" | "partner" | "marital",
  data: Record<string, unknown>,
  reason?: string,
) {
  const search = new URLSearchParams();
  if (reason?.trim()) search.set("reason", reason.trim());
  const query = search.toString();
  const res = await apiFetch(
    `${getApiBaseUrl()}/verification/staff-assisted/${profileId}/${section}${query ? `?${query}` : ""}`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    },
  );
  return readJsonResponse<VerificationSubmission>(res);
}

export const updateStaffAssistedPersonal = (
  token: string,
  profileId: string,
  data: Record<string, unknown>,
  reason?: string,
) => putStaffAssistedSection(token, profileId, "personal", data, reason);

export const updateStaffAssistedFamily = (
  token: string,
  profileId: string,
  data: Record<string, unknown>,
  reason?: string,
) => putStaffAssistedSection(token, profileId, "family", data, reason);

export const updateStaffAssistedPartner = (
  token: string,
  profileId: string,
  data: Record<string, unknown>,
  reason?: string,
) => putStaffAssistedSection(token, profileId, "partner", data, reason);

export const updateStaffAssistedMarital = (
  token: string,
  profileId: string,
  data: Record<string, unknown>,
  reason?: string,
) => putStaffAssistedSection(token, profileId, "marital", data, reason);

export async function uploadStaffAssistedPhoto(
  token: string,
  profileId: string,
  file: File,
  type: "primary" | "gallery" = "primary",
  slot?: "other" | "family",
) {
  const form = new FormData();
  form.append("file", file);
  const search = new URLSearchParams({ type });
  if (slot) search.set("slot", slot);
  const res = await apiFetch(
    `${getApiBaseUrl()}/verification/staff-assisted/${profileId}/photos?${search}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  return readJsonResponse<unknown>(res);
}

export async function uploadStaffAssistedNid(
  token: string,
  profileId: string,
  file: File,
  side: "front" | "back",
) {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(
    `${getApiBaseUrl()}/verification/staff-assisted/${profileId}/nid?side=${side}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  return readJsonResponse<unknown>(res);
}

export async function deleteStaffAssistedPhoto(
  token: string,
  profileId: string,
  photoId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/verification/staff-assisted/${profileId}/photos/${photoId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return readJsonResponse<{ deleted: boolean }>(res);
}

export async function deleteStaffAssistedNid(
  token: string,
  profileId: string,
  side: "front" | "back",
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/verification/staff-assisted/${profileId}/nid?side=${side}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return readJsonResponse<{ deleted: boolean }>(res);
}

export async function submitStaffAssistedProfile(
  token: string,
  profileId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/verification/staff-assisted/${profileId}/submit`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
  return readJsonResponse<{ submitted: boolean }>(res);
}
