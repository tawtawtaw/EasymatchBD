import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
import { invalidateMembershipAccountCache } from "@/lib/membership-account";

export type MembershipCheckoutResult = {
  gatewayUrl: string;
  tranId: string;
};

export async function startMembershipCheckout(
  token: string,
  plan: string,
): Promise<MembershipCheckoutResult> {
  const res = await apiFetch(`${getApiBaseUrl()}/membership/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
  });
  return readJsonResponse<MembershipCheckoutResult>(res);
}

export type MembershipConfirmResult = {
  synced: boolean;
  paymentStatus: string | null;
  subscription: {
    plan: string;
    isActive: boolean;
    endsAt: string | null;
  } | null;
  isPaidMember: boolean;
};

export async function confirmMembershipPayment(
  token: string,
  options?: { tranId?: string; valId?: string },
): Promise<MembershipConfirmResult> {
  const res = await apiFetch(`${getApiBaseUrl()}/membership/payments/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tranId: options?.tranId,
      valId: options?.valId,
    }),
  });
  const result = await readJsonResponse<MembershipConfirmResult>(res);
  if (result.isPaidMember || result.synced) {
    invalidateMembershipAccountCache();
  }
  return result;
}
