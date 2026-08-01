import { config } from "../config/env";
import type { AppLocale } from "./locale";
import { openExternalAppUrl } from "./webview-external-url";

export function connectionsWebPageUrl(
  locale: AppLocale,
  connectionId?: string,
): string {
  const base = `${config.webBaseUrl}/${locale}/connections`;
  if (!connectionId?.trim()) return base;
  const params = new URLSearchParams({ connectionId: connectionId.trim() });
  return `${base}?${params.toString()}`;
}

export async function openConnectionsWebPage(
  locale: AppLocale,
  connectionId?: string,
): Promise<boolean> {
  return openExternalAppUrl(connectionsWebPageUrl(locale, connectionId));
}
