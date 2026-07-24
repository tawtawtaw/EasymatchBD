import { isPaidMember, type MembershipSnapshot } from "@easymatch/shared";

export { isPaidMember, type MembershipSnapshot };

export type MembershipPurchaseEligibility = {
  hasProfile: boolean;
  isVerified: boolean;
};

export function membershipFromSession(session: {
  isPaidMember?: boolean;
  subscription?: MembershipSnapshot | null;
} | null | undefined) {
  if (!session) return false;
  if (typeof session.isPaidMember === "boolean") {
    return session.isPaidMember;
  }
  return isPaidMember(session.subscription);
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
  if (membershipFromSession(session)) return false;
  if (!eligibility.hasProfile) return false;
  return eligibility.isVerified;
}
