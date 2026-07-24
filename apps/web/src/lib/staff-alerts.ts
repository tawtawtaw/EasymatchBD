import { EASYMATCH_API_URL } from "@easymatch/shared";
import { dedupeRequest } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export type StaffAlertsSummary = {
  verificationPending: number;
  complaintsUnassigned: number;
  consultantCasesQueued: number;
  deletionRequestsPending: number;
  unreadNotifications: number;
};

export type StaffNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkPath: string;
  entityId: string | null;
  createdAt: string;
  read: boolean;
};

export async function getStaffAlertsSummary(token: string) {
  return dedupeRequest(
    "staff-alerts-summary",
    async () => {
      const res = await fetch(`${API_URL}/staff/alerts-summary`, {
        headers: authHeaders(token),
      });
      return parseResponse<StaffAlertsSummary>(res);
    },
    5_000,
  );
}

export async function listStaffNotifications(token: string, limit = 20) {
  const res = await fetch(`${API_URL}/staff/notifications?limit=${limit}`, {
    headers: authHeaders(token),
  });
  return parseResponse<StaffNotificationItem[]>(res);
}

export async function markStaffNotificationsRead(token: string, ids: string[]) {
  const res = await fetch(`${API_URL}/staff/notifications/read`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ ids }),
  });
  return parseResponse<{ ok: boolean; marked: number }>(res);
}

export async function markAllStaffNotificationsRead(token: string) {
  const res = await fetch(`${API_URL}/staff/notifications/read-all`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<{ ok: boolean; marked: number }>(res);
}
