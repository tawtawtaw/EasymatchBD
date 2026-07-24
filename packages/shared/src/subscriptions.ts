export const SubscriptionPlan = {
  FREE: 'free',
  GOLD: 'gold',
  PLATINUM: 'platinum',
} as const;

export type SubscriptionPlan =
  (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

export type MembershipSnapshot = {
  plan: string;
  isActive: boolean;
  endsAt?: string | Date | null;
};

/** Active gold/platinum (or future paid plan), excluding expired subscriptions. */
export function isPaidMember(
  subscription: MembershipSnapshot | null | undefined,
): boolean {
  if (!subscription?.isActive) return false;
  if (subscription.plan === SubscriptionPlan.FREE) return false;
  if (subscription.endsAt) {
    return new Date(subscription.endsAt).getTime() > Date.now();
  }
  return true;
}

export const PAID_MEMBERSHIP_REQUIRED_MESSAGE =
  'This feature requires an active paid membership.';

export const VERIFIED_MEMBER_REQUIRED_FOR_SUBSCRIPTION_MESSAGE =
  'Only verified members can purchase Gold or Platinum membership.';

export const PROFILE_REQUIRED_FOR_SUBSCRIPTION_MESSAGE =
  'Create your matrimonial profile before purchasing paid membership.';
