import { EASYMATCH_API_URL } from "@easymatch/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

export type AdminPaymentFilter =
  | "all"
  | "pending"
  | "validated"
  | "failed"
  | "cancelled";

export type AdminPaymentMember = {
  fullName: string | null;
  profileCode: string | null;
  phone: string | null;
  email: string | null;
};

export type AdminPaymentRow = {
  id: string;
  tranId: string;
  valId: string | null;
  plan: string;
  amountBdt: string;
  currency: string;
  durationDays: number;
  status: AdminPaymentFilter extends "all" ? string : AdminPaymentFilter;
  sslStatus: string | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  member: AdminPaymentMember;
};

export type AdminPaymentStats = {
  totalInitiated: number;
  byStatus: {
    pending: number;
    validated: number;
    failed: number;
    cancelled: number;
  };
  successRatePercent: number;
  revenue: {
    todayBdt: string;
    weekBdt: string;
    monthBdt: string;
    allTimeBdt: string;
    todayCount: number;
    weekCount: number;
    monthCount: number;
    allTimeCount: number;
  };
  byPlan: {
    gold: { count: number; revenueBdt: string };
    platinum: { count: number; revenueBdt: string };
  };
  activeMembers: {
    total: number;
    gold: number;
    platinum: number;
  };
  lastValidatedAt: string | null;
  dailyTrend: { date: string; count: number; revenueBdt: string }[];
};

export type AdminPaymentDetail = AdminPaymentRow & {
  userId: string;
  sslResponse: unknown;
  gatewayUrl: string | null;
  sessionKey: string | null;
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

export async function listAdminMembershipPayments(
  token: string,
  params: {
    page?: number;
    limit?: number;
    q?: string;
    filter?: AdminPaymentFilter;
  },
) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.q) search.set("q", params.q);
  if (params.filter) search.set("filter", params.filter);

  const res = await fetch(
    `${API_URL}/admin/membership-payments?${search.toString()}`,
    { headers: authHeaders(token) },
  );

  return parseResponse<{
    items: AdminPaymentRow[];
    total: number;
    page: number;
    limit: number;
    stats: AdminPaymentStats;
  }>(res);
}

export async function getAdminMembershipPayment(
  token: string,
  id: string,
) {
  const res = await fetch(`${API_URL}/admin/membership-payments/${id}`, {
    headers: authHeaders(token),
  });
  return parseResponse<AdminPaymentDetail>(res);
}

export type AdminConsultantPaymentRow = {
  id: string;
  tranId: string;
  valId: string | null;
  serviceType: string;
  serviceLabelEn: string;
  amountBdt: string;
  currency: string;
  status: string;
  sslStatus: string | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  member: AdminPaymentMember;
  engagement: { id: string; status: string } | null;
};

export type AdminConsultantPaymentStats = {
  totalInitiated: number;
  byStatus: AdminPaymentStats["byStatus"];
  successRatePercent: number;
  revenue: AdminPaymentStats["revenue"];
};

export async function listAdminConsultantPayments(
  token: string,
  params: {
    page?: number;
    limit?: number;
    q?: string;
    filter?: AdminPaymentFilter;
  },
) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.q) search.set("q", params.q);
  if (params.filter) search.set("filter", params.filter);

  const res = await fetch(
    `${API_URL}/admin/consultant-payments?${search.toString()}`,
    { headers: authHeaders(token) },
  );

  return parseResponse<{
    items: AdminConsultantPaymentRow[];
    total: number;
    page: number;
    limit: number;
    stats: AdminConsultantPaymentStats;
  }>(res);
}
