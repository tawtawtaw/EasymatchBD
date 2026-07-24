import { EASYMATCH_API_URL } from "@easymatch/shared";
import type { VerificationSubmission } from "@/lib/verification";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

export type AdminProfileKind = "member" | "staff";

export type AdminProfileListItem = {
  userId: string;
  kind: AdminProfileKind;
  role: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  profileId: string | null;
  profileCode: string | null;
  fullName: string | null;
  designation: string | null;
  officeDistrict: string | null;
  isVerified: boolean | null;
  subscriptionPlan: string | null;
  isPaidMember: boolean;
  updatedAt: string;
};

export type AdminStaffProfileDetail = {
  userId: string;
  role: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  staffProfile: {
    id: string;
    fullName: string | null;
    email: string | null;
    employeeId: string | null;
    designation: string | null;
    officeDivision: string | null;
    officeDistrict: string | null;
    officeAddressLine: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
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

export async function listAdminProfiles(
  token: string,
  params: {
    page?: number;
    limit?: number;
    q?: string;
    kind?: AdminProfileKind | "all";
    role?: string;
    includeInactive?: boolean;
  } = {},
) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.kind && params.kind !== "all") search.set("kind", params.kind);
  if (params.role) search.set("role", params.role);
  if (params.includeInactive) search.set("includeInactive", "true");

  const query = search.toString();
  const res = await fetch(
    `${API_URL}/admin/profiles${query ? `?${query}` : ""}`,
    { headers: authHeaders(token) },
  );

  return parseResponse<{
    items: AdminProfileListItem[];
    total: number;
    page: number;
    limit: number;
  }>(res);
}

export async function getAdminStaffProfile(token: string, userId: string) {
  const res = await fetch(`${API_URL}/admin/profiles/staff/${userId}`, {
    headers: authHeaders(token),
  });
  return parseResponse<AdminStaffProfileDetail>(res);
}

export async function getAdminMemberProfile(token: string, profileId: string) {
  const res = await fetch(`${API_URL}/admin/profiles/members/${profileId}`, {
    headers: authHeaders(token),
  });
  return parseResponse<VerificationSubmission>(res);
}
