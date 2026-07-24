import { EASYMATCH_API_URL } from "@easymatch/shared";

/** Browser calls use the Next.js rewrite (`/api/v1` → local API). SSR always hits the local API. */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const injected = (
      window as Window & { __EASYMATCH_API_BASE_URL__?: string }
    ).__EASYMATCH_API_BASE_URL__?.trim();
    if (injected) {
      return injected.replace(/\/$/, "");
    }
    return "/api/v1";
  }
  return EASYMATCH_API_URL;
}
