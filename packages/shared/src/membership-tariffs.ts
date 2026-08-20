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
  discountPriceBdt?: string | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  discountLabelEn?: string | null;
  discountLabelBn?: string | null;
  updatedAt: string;
};

export type MembershipTariffDiscountFields = {
  priceBdt: string | number;
  discountPriceBdt?: string | number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  discountLabelEn?: string | null;
  discountLabelBn?: string | null;
};

export function formatTariffPriceBdt(priceBdt: string | number): string {
  const amount = typeof priceBdt === 'string' ? Number(priceBdt) : priceBdt;
  if (!Number.isFinite(amount)) return String(priceBdt);
  return new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseTariffAmount(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === '') return null;
  const amount = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(amount) ? amount : null;
}

/** YYYY-MM-DD of an ISO timestamp, used as a calendar date (not an instant). */
export function tariffCalendarDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const day = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function calendarDateInDhaka(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isMembershipDiscountActive(
  tariff: MembershipTariffDiscountFields,
  now = new Date(),
): boolean {
  const listPrice = parseTariffAmount(tariff.priceBdt);
  const salePrice = parseTariffAmount(tariff.discountPriceBdt);
  const endsOn = tariffCalendarDate(tariff.discountEndsAt);
  if (
    listPrice == null ||
    salePrice == null ||
    salePrice < 0 ||
    salePrice >= listPrice ||
    !endsOn
  ) {
    return false;
  }

  const today = calendarDateInDhaka(now);
  if (today > endsOn) return false;
  const startsOn = tariffCalendarDate(tariff.discountStartsAt);
  if (startsOn && today < startsOn) return false;
  return true;
}

export function membershipEffectivePriceBdt(
  tariff: MembershipTariffDiscountFields,
  now = new Date(),
): string {
  const listPrice = parseTariffAmount(tariff.priceBdt);
  if (isMembershipDiscountActive(tariff, now)) {
    return parseTariffAmount(tariff.discountPriceBdt)!.toFixed(2);
  }
  return listPrice != null ? listPrice.toFixed(2) : String(tariff.priceBdt);
}

export function membershipDiscountSavingsBdt(
  tariff: MembershipTariffDiscountFields,
  now = new Date(),
): number | null {
  if (!isMembershipDiscountActive(tariff, now)) return null;
  const listPrice = parseTariffAmount(tariff.priceBdt);
  const salePrice = parseTariffAmount(tariff.discountPriceBdt);
  if (listPrice == null || salePrice == null) return null;
  return Math.round((listPrice - salePrice) * 100) / 100;
}

export function membershipDiscountLabel(
  tariff: MembershipTariffDiscountFields,
  locale: string,
): string | null {
  if (!isMembershipDiscountActive(tariff)) return null;
  if (locale === 'bn' && tariff.discountLabelBn?.trim()) {
    return tariff.discountLabelBn.trim();
  }
  return tariff.discountLabelEn?.trim() || null;
}

export function formatMembershipOfferUntilDate(
  iso: string | null | undefined,
  locale: string,
): string {
  const day = tariffCalendarDate(iso);
  if (!day) return '';
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
