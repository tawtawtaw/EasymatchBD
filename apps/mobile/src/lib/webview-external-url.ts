import { Linking, Platform } from "react-native";

const IN_WEBVIEW_SCHEMES = new Set(["http", "https", "about", "blob", "data"]);

function parseScheme(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return "relative";
  }
  const match = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function isInWebViewUrl(url: string): boolean {
  const scheme = parseScheme(url);
  if (!scheme || scheme === "relative") return true;
  return IN_WEBVIEW_SCHEMES.has(scheme);
}

function whatsAppHttpsFallback(url: string): string | null {
  const phoneMatch = url.match(/[?&]phone=(\d+)/);
  if (!phoneMatch) return null;
  const textMatch = url.match(/[?&]text=([^&]+)/);
  const text = textMatch ? decodeURIComponent(textMatch[1]) : "";
  const base = `https://wa.me/${phoneMatch[1]}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

function androidIntentFallback(url: string): string | null {
  if (Platform.OS !== "android" || !url.startsWith("intent://")) return null;
  const match = url.match(/;S\.browser_fallback_url=([^;]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function openExternalAppUrl(url: string): Promise<boolean> {
  const candidates = [url, androidIntentFallback(url), whatsAppHttpsFallback(url)].filter(
    (value, index, list): value is string =>
      typeof value === "string" && list.indexOf(value) === index,
  );

  for (const candidate of candidates) {
    try {
      const canOpen = await Linking.canOpenURL(candidate);
      if (canOpen) {
        await Linking.openURL(candidate);
        return true;
      }
    } catch {
      // try next candidate
    }
  }

  for (const candidate of candidates) {
    try {
      await Linking.openURL(candidate);
      return true;
    } catch {
      // try next candidate
    }
  }

  return false;
}

/** Return true to allow WebView navigation, false to cancel and open externally. */
export function handleWebViewExternalUrl(url: string): boolean {
  if (isInWebViewUrl(url)) return true;
  void openExternalAppUrl(url);
  return false;
}

export function isUnknownUrlSchemeError(code?: number, description?: string): boolean {
  return code === -10 || Boolean(description?.includes("ERR_UNKNOWN_URL_SCHEME"));
}
