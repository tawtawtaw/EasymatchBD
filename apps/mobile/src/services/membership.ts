import type { MembershipTariff } from "@easymatch/shared";
import { apiRequest } from "./api/client";
import { dedupeRequest, invalidateDedupeCache } from "./api/dedupe";

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

export type MembershipCheckoutResult = {
  gatewayUrl: string;
  tranId: string;
};

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

export async function getMembershipTariffs(): Promise<MembershipTariff[]> {
  return dedupeRequest(
    "membership-tariffs",
    () => apiRequest<MembershipTariff[]>("/membership/tariffs", { auth: false }),
    300_000,
  );
}

export async function getMembershipAccount(): Promise<MembershipAccountSummary> {
  return dedupeRequest(
    "membership-account",
    () => apiRequest<MembershipAccountSummary>("/membership/account"),
    30_000,
  );
}

export async function startMembershipCheckout(
  plan: string,
): Promise<MembershipCheckoutResult> {
  return apiRequest<MembershipCheckoutResult>("/membership/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function confirmMembershipPayment(options?: {
  tranId?: string;
  valId?: string;
}): Promise<MembershipConfirmResult> {
  const result = await apiRequest<MembershipConfirmResult>("/membership/payments/confirm", {
    method: "POST",
    body: JSON.stringify({
      tranId: options?.tranId,
      valId: options?.valId,
    }),
  });
  invalidateDedupeCache("membership-account");
  return result;
}
