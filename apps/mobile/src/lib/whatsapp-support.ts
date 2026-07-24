import { normalizeBangladeshPhone } from "@easymatch/shared";

export function normalizeWhatsAppPhoneDigits(
  raw: string | null | undefined,
): string | null {
  const value = raw?.trim();
  if (!value) return null;

  try {
    return normalizeBangladeshPhone(value).replace(/\D/g, "");
  } catch {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("880") && digits.length >= 12) {
      return digits;
    }
    if (digits.startsWith("01") && digits.length === 11) {
      return `88${digits}`;
    }
    return null;
  }
}

export function getWhatsAppSupportPhoneDigits(): string | null {
  return normalizeWhatsAppPhoneDigits(
    process.env.EXPO_PUBLIC_WHATSAPP_SUPPORT_NUMBER,
  );
}

export function isWhatsAppSupportEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_WHATSAPP_SUPPORT_ENABLED === "false") {
    return false;
  }
  return getWhatsAppSupportPhoneDigits() !== null;
}

export function buildWhatsAppChatUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export type WhatsAppSupportTopic =
  | "account"
  | "browse"
  | "verification"
  | "privacy"
  | "membership"
  | "general";

export const WHATSAPP_SUPPORT_TOPICS: WhatsAppSupportTopic[] = [
  "account",
  "browse",
  "verification",
  "privacy",
  "membership",
  "general",
];
