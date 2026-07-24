import { EASYMATCH_API_URL } from "@easymatch/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

export type ProfileDeletionRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type ProfileDeletionRequestItem = {
  id: string;
  status: ProfileDeletionRequestStatus;
  targetKind: "member" | "staff";
  profileId: string | null;
  reason: string | null;
  reviewNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  target: {
    userId: string;
    role: string;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    profileCode: string | null;
    fullName: string | null;
  };
  requestedBy: {
    id: string;
    phone: string | null;
    email: string | null;
    fullName: string | null;
  };
  reviewedBy: {
    id: string;
    phone: string | null;
    email: string | null;
    fullName: string | null;
  } | null;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & {
    message?: string | string[];
    statusCode?: number;
  };
  if (!res.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function listProfileDeletionRequests(
  token: string,
  status?: ProfileDeletionRequestStatus,
) {
  const query = status ? `?status=${status}` : "";
  const res = await fetch(`${API_URL}/admin/profile-deletions${query}`, {
    headers: authHeaders(token),
  });
  return parseResponse<ProfileDeletionRequestItem[]>(res);
}

export async function createProfileDeletionRequest(
  token: string,
  userId: string,
  reason?: string,
) {
  const res = await fetch(`${API_URL}/admin/profile-deletions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ userId, reason }),
  });
  return parseResponse<ProfileDeletionRequestItem>(res);
}

export async function approveProfileDeletionRequest(
  token: string,
  requestId: string,
) {
  const res = await fetch(
    `${API_URL}/admin/profile-deletions/${requestId}/approve`,
    { method: "POST", headers: authHeaders(token) },
  );
  return parseResponse<{ approved: boolean }>(res);
}

export async function rejectProfileDeletionRequest(
  token: string,
  requestId: string,
  reviewNote?: string,
) {
  const res = await fetch(
    `${API_URL}/admin/profile-deletions/${requestId}/reject`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ reviewNote }),
    },
  );
  return parseResponse<{ rejected: boolean }>(res);
}

export async function cancelProfileDeletionRequest(
  token: string,
  requestId: string,
) {
  const res = await fetch(`${API_URL}/admin/profile-deletions/${requestId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return parseResponse<{ cancelled: boolean }>(res);
}
