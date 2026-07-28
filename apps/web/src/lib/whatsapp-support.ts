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

function getWhatsAppSupportNumberRaw(): string | undefined {
  const raw =
    process.env.WHATSAPP_SUPPORT_NUMBER?.trim() ||
    process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER?.trim();
  return raw || undefined;
}

function isWhatsAppSupportDisabled(): boolean {
  if (process.env.WHATSAPP_SUPPORT_ENABLED === "false") return true;
  if (process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_ENABLED === "false") return true;
  return false;
}

export function getWhatsAppSupportPhoneDigits(): string | null {
  if (isWhatsAppSupportDisabled()) return null;
  return normalizeWhatsAppPhoneDigits(getWhatsAppSupportNumberRaw());
}

export function isWhatsAppSupportEnabled(
  configuredNumber?: string | null,
) {
  if (isWhatsAppSupportDisabled()) {
    return false;
  }
  return normalizeWhatsAppPhoneDigits(
    configuredNumber ?? getWhatsAppSupportNumberRaw(),
  ) !== null;
}

export function buildWhatsAppChatUrl(phoneDigits: string, message: string) {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export function resolveWhatsAppSupportNumber(): string | null {
  if (isWhatsAppSupportDisabled()) {
    return null;
  }
  const raw = getWhatsAppSupportNumberRaw();
  if (!raw) return null;
  return normalizeWhatsAppPhoneDigits(raw) ? raw : null;
}
