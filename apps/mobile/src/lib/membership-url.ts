import { config } from "../config/env";
import type { AppLocale } from "./locale";

export function membershipPageUrl(locale: AppLocale = "en"): string {
  const base = config.webBaseUrl.replace(/\/$/, "");
  return `${base}/${locale}/membership`;
}

export function membershipCheckoutPageUrl(locale: AppLocale = "en"): string {
  const base = config.webBaseUrl.replace(/\/$/, "");
  return `${base}/${locale}/membership?from=mobile`;
}
