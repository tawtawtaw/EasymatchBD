import { EASYMATCH_API_URL } from "@easymatch/shared";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/** Dev browsers can use the Next.js rewrite (`/api/v1` → local API). Production uses `NEXT_PUBLIC_API_URL`. */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  if (typeof window !== "undefined") {
    const injected = (
      window as Window & { __EASYMATCH_API_BASE_URL__?: string }
    ).__EASYMATCH_API_BASE_URL__?.trim();
    if (injected) {
      return normalizeBaseUrl(injected);
    }
    return "/api/v1";
  }

  return EASYMATCH_API_URL;
}
