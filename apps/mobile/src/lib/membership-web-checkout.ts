import { config } from "../config/env";
import { confirmMembershipPayment } from "../services/membership";
import { invalidateDedupeCache } from "../services/api/dedupe";
import { useAuthStore } from "../store/authStore";
import type { AppLocale } from "./locale";
import { membershipFromSession } from "./membership";
import { openExternalAppUrl } from "./webview-external-url";

export function membershipWebPageUrl(locale: AppLocale): string {
  return `${config.webBaseUrl}/${locale}/membership`;
}

export async function openMembershipWebPage(locale: AppLocale): Promise<boolean> {
  return openExternalAppUrl(membershipWebPageUrl(locale));
}

/** Apply validated web payments and refresh session (for app after browser checkout). */
export async function syncMembershipAfterWebPayment(): Promise<{ isPaidMember: boolean }> {
  invalidateDedupeCache("membership-account");
  invalidateDedupeCache("auth:session");
  invalidateDedupeCache("auth:me:1");

  let confirmedPaid = false;
  try {
    const result = await confirmMembershipPayment();
    confirmedPaid = result.isPaidMember;
  } catch {
    // No pending payment or confirm failed — still refresh session below.
  }

  await useAuthStore.getState().refreshSession();
  const session = useAuthStore.getState().session;
  const isPaidMember =
    confirmedPaid ||
    Boolean(session?.isPaidMember) ||
    membershipFromSession(session);

  return { isPaidMember };
}
