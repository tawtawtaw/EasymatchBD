import { dedupeRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";

export type MemberSubscriptionSnapshot = {
  plan: string;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  isPaidMember: boolean;
  currentPeriodStartsAt?: string | null;
  currentPeriodEndsAt?: string | null;
};

export type MemberPaymentRecord = {
  id: string;
  tranId: string;
  valId: string | null;
  plan: string;
  serviceCode: string | null;
  amountBdt: string;
  currency: string;
  durationDays: number;
  status: string;
  validatedAt: string | null;
  createdAt: string;
};

export type MembershipAccountSummary = {
  subscription: MemberSubscriptionSnapshot | null;
  member: {
    fullName: string | null;
    profileCode: string | null;
    phone: string | null;
    email: string | null;
  };
  payments: MemberPaymentRecord[];
};

export type MembershipPaymentReceipt = MemberPaymentRecord & {
  member: MembershipAccountSummary["member"];
  receiptKind?: "payment" | "subscription";
  subscriptionStartsAt?: string | null;
  subscriptionEndsAt?: string | null;
};

export async function getMembershipAccount(
  token: string,
): Promise<MembershipAccountSummary> {
  return dedupeRequest(
    `membership-account:${token.slice(-12)}`,
    async () => {
      const res = await apiFetch(`${getApiBaseUrl()}/membership/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return readJsonResponse<MembershipAccountSummary>(res);
    },
    30_000,
  );
}

export async function getMembershipPaymentReceipt(
  token: string,
  paymentId: string,
): Promise<MembershipPaymentReceipt> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/membership/payments/${paymentId}/receipt`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return readJsonResponse<MembershipPaymentReceipt>(res);
}

export async function getMembershipSubscriptionReceipt(
  token: string,
): Promise<MembershipPaymentReceipt> {
  const res = await apiFetch(`${getApiBaseUrl()}/membership/account/receipt`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJsonResponse<MembershipPaymentReceipt>(res);
}
