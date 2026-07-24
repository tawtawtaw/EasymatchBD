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
    process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER,
  );
}

export function isWhatsAppSupportEnabled(
  configuredNumber?: string | null,
) {
  if (process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_ENABLED === "false") {
    return false;
  }
  return normalizeWhatsAppPhoneDigits(
    configuredNumber ?? process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER,
  ) !== null;
}

export function buildWhatsAppChatUrl(phoneDigits: string, message: string) {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export function resolveWhatsAppSupportNumber(): string | null {
  if (process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_ENABLED === "false") {
    return null;
  }
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER?.trim();
  if (!raw) return null;
  return normalizeWhatsAppPhoneDigits(raw) ? raw : null;
}
