import type { PublicMarketingBanner } from "@easymatch/shared";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { readJsonResponse } from "@/lib/parse-response";

const FETCH_TIMEOUT_MS = 8_000;

export async function fetchPublicMarketingBanner(): Promise<PublicMarketingBanner | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${getApiBaseUrl()}/marketing/banner`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    const data = await readJsonResponse<{ banner: PublicMarketingBanner | null }>(
      res,
    );
    return data.banner;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
