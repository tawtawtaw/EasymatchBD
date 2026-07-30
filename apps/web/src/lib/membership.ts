import { isPaidMember, type MembershipSnapshot } from "@easymatch/shared";

export { isPaidMember, type MembershipSnapshot };

export type MembershipPurchaseEligibility = {
  hasProfile: boolean;
  isVerified: boolean;
};

/** True when the user currently has active paid membership (not expired). */
export function activePaidMembership(session: {
  isPaidMember?: boolean;
  subscription?: MembershipSnapshot | null;
} | null | undefined) {
  if (!session) return false;
  if (session.subscription) {
    return isPaidMember(session.subscription);
  }
  return session.isPaidMember === true;
}

export function membershipFromSession(session: {
  isPaidMember?: boolean;
  subscription?: MembershipSnapshot | null;
} | null | undefined) {
  return activePaidMembership(session);
}

export function resolveMembershipPurchaseEligibility(input: {
  sessionHasProfile?: boolean;
  sessionIsVerified?: boolean;
  profile?: { id?: string; isVerified?: boolean } | null;
}): MembershipPurchaseEligibility {
  if (input.profile) {
    return {
      hasProfile: Boolean(input.profile.id),
      isVerified: Boolean(input.profile.isVerified),
    };
  }

  return {
    hasProfile: Boolean(input.sessionHasProfile),
    isVerified: Boolean(input.sessionIsVerified),
  };
}

export function canPurchaseMembership(
  session: {
    isPaidMember?: boolean;
    subscription?: MembershipSnapshot | null;
  } | null | undefined,
  eligibility: MembershipPurchaseEligibility | null | undefined,
) {
  if (!session || !eligibility) return false;
  if (activePaidMembership(session)) return false;
  if (!eligibility.hasProfile) return false;
  return eligibility.isVerified;
}
