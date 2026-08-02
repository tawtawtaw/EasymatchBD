import { invalidateDedupeCache } from "../services/api/dedupe";
import { invalidateProfileMediaCaches } from "../services/media";
import { invalidateProfileEditorBootstrapCache } from "../services/profile";
import { confirmMembershipPayment } from "../services/membership";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import type { AppLocale } from "./locale";
import {
  clearMemberVerificationMediaCache,
  useMemberVerificationStore,
} from "../store/memberVerificationStore";
import { useOnboardingStore } from "../store/onboardingStore";

/** Clear client caches for profile completion, media, and verification summaries. */
export function invalidateMemberProfileStateCaches() {
  invalidateProfileEditorBootstrapCache();
  invalidateProfileMediaCaches();
  invalidateDedupeCache("profile:me");
  invalidateDedupeCache("auth:session");
  invalidateDedupeCache("auth:me:1");
  invalidateDedupeCache("auth:me:0");
  clearMemberVerificationMediaCache();
}

/** After biodata/media/verification changes, refresh session + onboarding + verification gate. */
export async function syncMemberProfileStateAfterMutation(locale?: AppLocale) {
  invalidateMemberProfileStateCaches();
  const resolvedLocale = locale ?? useLocaleStore.getState().locale;
  await Promise.all([
    useAuthStore.getState().refreshSession(),
    useOnboardingStore.getState().refresh(resolvedLocale, { force: true }),
    useMemberVerificationStore.getState().sync(true),
  ]);
}

export async function refreshMemberStatusOnForeground() {
  invalidateDedupeCache("membership-account");

  try {
    await confirmMembershipPayment();
  } catch {
    // no validated web payment to apply
  }

  await syncMemberProfileStateAfterMutation();
}

export function invalidateConnectionsCache() {
  invalidateDedupeCache("alerts-summary");
  invalidateDedupeCache("video-call-alerts");
  invalidateDedupeCache("discovery-interests");
  invalidateDedupeCache("discovery-connections");
  invalidateDedupeCache("discovery:home-bootstrap");
}
