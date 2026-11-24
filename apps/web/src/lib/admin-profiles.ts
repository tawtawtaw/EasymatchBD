import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
import type { VerificationSubmission } from "@/lib/verification";

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
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/profiles${query ? `?${query}` : ""}`,
    { headers: authHeaders(token) },
  );

  return readJsonResponse<{
    items: AdminProfileListItem[];
    total: number;
    page: number;
    limit: number;
  }>(res);
}

export async function getAdminStaffProfile(token: string, userId: string) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/profiles/staff/${userId}`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<AdminStaffProfileDetail>(res);
}

export async function getAdminMemberProfile(token: string, profileId: string) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/profiles/members/${profileId}`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<VerificationSubmission>(res);
}

export type AdminBiodataSection = "personal" | "family" | "partner" | "marital";

async function putAdminMemberBiodataSection(
  token: string,
  profileId: string,
  section: AdminBiodataSection,
  data: Record<string, unknown>,
  reason?: string,
) {
  const search = new URLSearchParams();
  if (reason?.trim()) search.set("reason", reason.trim());
  const query = search.toString();
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/profiles/members/${profileId}/${section}${query ? `?${query}` : ""}`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    },
  );
  return readJsonResponse<VerificationSubmission>(res);
}

export function updateAdminMemberPersonal(
  token: string,
  profileId: string,
  data: Record<string, unknown>,
  reason?: string,
) {
  return putAdminMemberBiodataSection(token, profileId, "personal", data, reason);
}

export function updateAdminMemberFamily(
  token: string,
  profileId: string,
  data: Record<string, unknown>,
  reason?: string,
) {
  return putAdminMemberBiodataSection(token, profileId, "family", data, reason);
}

export function updateAdminMemberPartner(
  token: string,
  profileId: string,
  data: Record<string, unknown>,
  reason?: string,
) {
  return putAdminMemberBiodataSection(token, profileId, "partner", data, reason);
}

export function updateAdminMemberMarital(
  token: string,
  profileId: string,
  data: Record<string, unknown>,
  reason?: string,
) {
  return putAdminMemberBiodataSection(token, profileId, "marital", data, reason);
}
