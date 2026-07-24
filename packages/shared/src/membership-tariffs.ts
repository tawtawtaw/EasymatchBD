import { SubscriptionPlan } from './subscriptions';

export type MembershipTariffPlan =
  | typeof SubscriptionPlan.GOLD
  | typeof SubscriptionPlan.PLATINUM;

export const PAID_MEMBERSHIP_TARIFF_PLANS: MembershipTariffPlan[] = [
  SubscriptionPlan.GOLD,
  SubscriptionPlan.PLATINUM,
];

export type MembershipTariff = {
  id: string;
  plan: MembershipTariffPlan;
  labelEn: string;
  labelBn: string | null;
  priceBdt: string;
  currency: string;
  durationDays: number;
  isActive: boolean;
  sortOrder: number;
  descriptionEn: string | null;
  descriptionBn: string | null;
  updatedAt: string;
};

export function formatTariffPriceBdt(priceBdt: string | number): string {
  const amount = typeof priceBdt === 'string' ? Number(priceBdt) : priceBdt;
  if (!Number.isFinite(amount)) return String(priceBdt);
  return new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
