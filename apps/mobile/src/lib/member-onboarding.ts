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

/** Keep forward progress when a cached bootstrap refresh races with accept/intent saves. */
export function mergeOnboardingBootstrap(
  previous: OnboardingBootstrap | null,
  incoming: OnboardingBootstrap,
): OnboardingBootstrap {
  if (!previous) return incoming;

  let merged: OnboardingBootstrap = { ...incoming };

  if (previous.termsAccepted && !incoming.termsAccepted) {
    merged = {
      ...merged,
      termsAccepted: true,
      termsVersion: previous.termsVersion ?? merged.termsVersion,
      termsDeclinedAt: null,
    };
  }

  const previousMode =
    previous.profile?.creationMode ?? previous.creationMode ?? null;
  const incomingMode =
    incoming.profile?.creationMode ?? incoming.creationMode ?? null;

  if (previousMode != null && incomingMode == null) {
    merged = {
      ...merged,
      creationMode: previousMode,
      onBehalfRelation: previous.onBehalfRelation ?? merged.onBehalfRelation,
      profile: merged.profile
        ? { ...merged.profile, creationMode: previousMode }
        : previous.profile,
    };
  }

  return merged;
}

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

export function isProfileBiodataComplete(input: {
  completionMissing?: string[];
  completionPercent?: number;
}): boolean {
  const missing = input.completionMissing ?? [];
  const percent = input.completionPercent ?? 0;
  return missing.length === 0 || percent >= 100;
}

export function mainTabInitialRoute(isVerified: boolean): "Home" | "Discovery" {
  return isVerified ? "Home" : "Discovery";
}
