import { EASYMATCH_API_URL } from "@easymatch/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

export type AdminInterestFilter = "all" | "pending" | "connected" | "declined";

export type AdminInterestLeg = {
  id: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt: string | null;
};

export type AdminMemberSummary = {
  userId: string;
  profileId: string | null;
  profileCode: string | null;
  fullName: string | null;
  gender: string | null;
  currentDistrict: string | null;
  phone: string | null;
  isVerified: boolean;
};

export type AdminConnectionSummary = {
  id: string;
  privacyLevel: number;
  pendingUpgradeLevel: number | null;
  pendingUpgradeByUserId: string | null;
  pendingUpgradeByName: string | null;
  updatedAt: string;
};

export type AdminInterestSummary = {
  level0: number;
  level1: number;
  level2: number;
  level3: number;
  pending: number;
  declined: number;
  pendingUpgrade: number;
};

export type AdminRelationshipRow = {
  memberA: AdminMemberSummary;
  memberB: AdminMemberSummary;
  interestAtoB: AdminInterestLeg | null;
  interestBtoA: AdminInterestLeg | null;
  connection: AdminConnectionSummary | null;
  relationshipLevel: number;
  lastActivityAt: string;
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

export async function listAdminInterests(
  token: string,
  params: {
    page?: number;
    limit?: number;
    q?: string;
    filter?: AdminInterestFilter;
  } = {},
) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.filter && params.filter !== "all") {
    search.set("filter", params.filter);
  }

  const query = search.toString();
  const res = await fetch(
    `${API_URL}/admin/interests${query ? `?${query}` : ""}`,
    { headers: authHeaders(token) },
  );

  return parseResponse<{
    items: AdminRelationshipRow[];
    total: number;
    page: number;
    limit: number;
    summary: AdminInterestSummary;
  }>(res);
}
