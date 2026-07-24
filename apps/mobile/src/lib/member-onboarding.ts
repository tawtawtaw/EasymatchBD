import type { ProfileEditorBootstrap } from "../types/profile";

export type OnboardingPhase =
  | "loading"
  | "terms"
  | "creation_intent"
  | "profile_setup"
  | "complete";

export type OnboardingBootstrap = ProfileEditorBootstrap & {
  currentTermsVersion?: string | null;
  termsVersion?: string | null;
  termsDeclinedAt?: string | null;
};

export function computeOnboardingPhase(
  bootstrap: OnboardingBootstrap | null,
): OnboardingPhase {
  if (!bootstrap) return "terms";

  if (bootstrap.termsDeclinedAt) {
    return "terms";
  }

  if (!bootstrap.termsAccepted) {
    return "terms";
  }

  const creationMode =
    bootstrap.profile?.creationMode ?? bootstrap.creationMode ?? null;
  if (creationMode == null) {
    return "creation_intent";
  }

  const missing = bootstrap.completionMissing ?? [];
  const percent = bootstrap.completionPercent ?? 0;
  if (missing.length > 0 && percent < 100) {
    return "profile_setup";
  }

  return "complete";
}

export function mainTabInitialRoute(isVerified: boolean): "Home" | "Discovery" {
  return isVerified ? "Home" : "Discovery";
}
