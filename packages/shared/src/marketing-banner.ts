import { calendarDateInDhaka, tariffCalendarDate } from './membership-tariffs';

/** Internal path only, e.g. `/membership`. */
export const MARKETING_BANNER_HREF_PATTERN = /^\/(?:[A-Za-z0-9/_-]+)?$/;

export const MARKETING_BANNER_MESSAGE_MAX = 220;
export const MARKETING_BANNER_LABEL_MAX = 40;
export const MARKETING_BANNER_HREF_MAX = 200;

export type MarketingBannerConfig = {
  enabled: boolean;
  messageEn: string;
  messageBn: string | null;
  labelEn: string | null;
  labelBn: string | null;
  href: string | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
};

export type PublicMarketingBanner = {
  messageEn: string;
  messageBn: string | null;
  labelEn: string | null;
  labelBn: string | null;
  href: string | null;
};

export function isValidMarketingBannerHref(value: string): boolean {
  return (
    value.length <= MARKETING_BANNER_HREF_MAX &&
    MARKETING_BANNER_HREF_PATTERN.test(value) &&
    !value.startsWith('//')
  );
}

export function isMarketingBannerActive(
  banner: {
    enabled: boolean;
    messageEn: string;
    startsAt?: string | null;
    endsAt?: string | null;
  },
  now = new Date(),
): boolean {
  if (!banner.enabled || !banner.messageEn.trim()) return false;
  const today = calendarDateInDhaka(now);
  const startsOn = tariffCalendarDate(banner.startsAt);
  const endsOn = tariffCalendarDate(banner.endsAt);
  if (startsOn && today < startsOn) return false;
  if (endsOn && today > endsOn) return false;
  return true;
}

export function marketingBannerMessage(
  banner: Pick<PublicMarketingBanner, 'messageEn' | 'messageBn'>,
  locale: string,
): string {
  if (locale === 'bn' && banner.messageBn?.trim()) {
    return banner.messageBn.trim();
  }
  return banner.messageEn.trim();
}

export function marketingBannerLabel(
  banner: Pick<PublicMarketingBanner, 'labelEn' | 'labelBn'>,
  locale: string,
): string | null {
  if (locale === 'bn' && banner.labelBn?.trim()) {
    return banner.labelBn.trim();
  }
  return banner.labelEn?.trim() || null;
}
