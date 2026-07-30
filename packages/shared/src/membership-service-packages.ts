import { SubscriptionPlan } from './subscriptions';

export type MembershipServicePackage = {
  code: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
};

export const MEMBERSHIP_SERVICE_PACKAGES: Record<
  typeof SubscriptionPlan.FREE | typeof SubscriptionPlan.GOLD | typeof SubscriptionPlan.PLATINUM,
  MembershipServicePackage
> = {
  [SubscriptionPlan.FREE]: {
    code: 'EMBD-FREE',
    nameEn: 'Free Registration',
    nameBn: 'বিনামূল্যে নিবন্ধন',
    descriptionEn: 'Mobile verification and basic biodata submission',
    descriptionBn: 'মোবাইল যাচাইকরণ ও মৌলিক বায়োডাটা জমা',
  },
  [SubscriptionPlan.GOLD]: {
    code: 'EMBD-STD',
    nameEn: 'Standard Membership',
    nameBn: 'স্ট্যান্ডার্ড সদস্যতা',
    descriptionEn: 'Extended search and interest management',
    descriptionBn: 'বর্ধিত অনুসন্ধান ও আগ্রহ ব্যবস্থাপনা',
  },
  [SubscriptionPlan.PLATINUM]: {
    code: 'EMBD-PLT',
    nameEn: 'Platinum Membership',
    nameBn: 'প্লাটিনাম সদস্যতা',
    descriptionEn:
      'Full paid access including messaging, video calls, and biodata PDF export',
    descriptionBn:
      'মেসেজিং, ভিডিও কল ও বায়োডাটা PDF সহ সম্পূর্ণ paid access',
  },
};

export function getMembershipServicePackage(
  plan: string,
): MembershipServicePackage | null {
  if (plan === SubscriptionPlan.FREE) {
    return MEMBERSHIP_SERVICE_PACKAGES[SubscriptionPlan.FREE];
  }
  if (plan === SubscriptionPlan.GOLD) {
    return MEMBERSHIP_SERVICE_PACKAGES[SubscriptionPlan.GOLD];
  }
  if (plan === SubscriptionPlan.PLATINUM) {
    return MEMBERSHIP_SERVICE_PACKAGES[SubscriptionPlan.PLATINUM];
  }
  return null;
}
