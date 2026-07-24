import { dedupeRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
import type { ConsultantServiceType } from "@easymatch/shared";

export type ConsultantEngagementItem = {
  id: string;
  connectionId: string;
  serviceType: ConsultantServiceType;
  serviceLabelEn: string;
  amountBdt: string;
  currency: string;
  requestedById: string;
  status: string;
  assignedConsultantId: string | null;
  memberNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConsultantCaseItem = ConsultantEngagementItem & {
  requester: {
    fullName: string | null;
    profileCode: string | null;
    phone: string | null;
  };
  connection: {
    privacyLevel: number;
    memberLow: { fullName: string | null; profileCode: string | null };
    memberHigh: { fullName: string | null; profileCode: string | null };
  };
};

export type ConsultantCheckoutResult = {
  gatewayUrl: string;
  tranId: string;
};

export type ConsultantConfirmResult = {
  synced: boolean;
  paymentStatus: string | null;
  engagement: ConsultantEngagementItem | null;
};

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function listConnectionConsultantEngagements(
  token: string,
  connectionId: string,
) {
  return dedupeRequest(
    `consultant-engagements:${token}:${connectionId}`,
    async () => {
      const res = await apiFetch(
        `${getApiBaseUrl()}/consultant/engagements?connectionId=${encodeURIComponent(connectionId)}`,
        { headers: authHeaders(token) },
      );
      return readJsonResponse<ConsultantEngagementItem[]>(res);
    },
    30_000,
  );
}

export async function startConsultantCheckout(
  token: string,
  body: {
    connectionId: string;
    serviceType: ConsultantServiceType;
    memberNotes?: string;
  },
) {
  const res = await apiFetch(`${getApiBaseUrl()}/consultant/checkout`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return readJsonResponse<ConsultantCheckoutResult>(res);
}

export async function confirmConsultantPayment(
  token: string,
  options?: { tranId?: string; valId?: string },
) {
  const res = await apiFetch(`${getApiBaseUrl()}/consultant/payments/confirm`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      tranId: options?.tranId,
      valId: options?.valId,
    }),
  });
  return readJsonResponse<ConsultantConfirmResult>(res);
}

export async function listConsultantCases(token: string) {
  const res = await apiFetch(`${getApiBaseUrl()}/consultant/cases`, {
    headers: authHeaders(token),
  });
  return readJsonResponse<ConsultantCaseItem[]>(res);
}

export async function assignConsultantCase(token: string, caseId: string) {
  const res = await apiFetch(`${getApiBaseUrl()}/consultant/cases/${caseId}/assign`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return readJsonResponse<ConsultantEngagementItem>(res);
}

export async function updateConsultantCaseStatus(
  token: string,
  caseId: string,
  status: "in_progress" | "completed" | "cancelled",
) {
  const res = await apiFetch(`${getApiBaseUrl()}/consultant/cases/${caseId}/status`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  return readJsonResponse<ConsultantEngagementItem>(res);
}
