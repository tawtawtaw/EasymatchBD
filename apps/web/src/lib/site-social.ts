import {
  buildWhatsAppChatUrl,
  getWhatsAppSupportPhoneDigits,
} from "@/lib/whatsapp-support";

export const FACEBOOK_PAGE_URL = "https://www.facebook.com/EasyMatchBD";
export const YOUTUBE_CHANNEL_URL =
  "https://www.youtube.com/@easymatchbd-matrimoni";

export function getFacebookPageUrl(): string {
  const url = process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim();
  return url || FACEBOOK_PAGE_URL;
}

export function getYouTubeChannelUrl(): string {
  const url = process.env.NEXT_PUBLIC_YOUTUBE_URL?.trim();
  return url || YOUTUBE_CHANNEL_URL;
}

export function getContactEmail(): string | null {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return email || null;
}

export function buildWhatsAppSupportHref(message: string): string | null {
  const phoneDigits = getWhatsAppSupportPhoneDigits();
  if (!phoneDigits) return null;
  return buildWhatsAppChatUrl(phoneDigits, message);
}
