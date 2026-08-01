import { invalidateDedupeCache } from "../services/api/dedupe";
import { confirmMembershipPayment } from "../services/membership";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import {
  clearMemberVerificationMediaCache,
  useMemberVerificationStore,
} from "../store/memberVerificationStore";
import { useOnboardingStore } from "../store/onboardingStore";

export async function refreshMemberStatusOnForeground() {
  invalidateDedupeCache("profile:");
  invalidateDedupeCache("membership-account");
  invalidateDedupeCache("auth:session");
  invalidateDedupeCache("auth:me:1");
  clearMemberVerificationMediaCache();

  try {
    await confirmMembershipPayment();
  } catch {
    // no validated web payment to apply
  }

  try {
    await useAuthStore.getState().refreshSession();
  } catch {
    // keep going with media/onboarding refresh
  }

  const locale = useLocaleStore.getState().locale;
  await Promise.all([
    useOnboardingStore.getState().refresh(locale, { force: true }),
    useMemberVerificationStore.getState().sync(true),
  ]);
}

export function invalidateConnectionsCache() {
  invalidateDedupeCache("alerts-summary");
  invalidateDedupeCache("video-call-alerts");
  invalidateDedupeCache("discovery-interests");
  invalidateDedupeCache("discovery-connections");
  invalidateDedupeCache("discovery:home-bootstrap");
}
