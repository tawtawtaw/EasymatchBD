import type { MembershipTariff } from "@easymatch/shared";
import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import type { DropdownMap } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { PublicMarketingHome } from "@/components/PublicMarketingHome";
import { getPublicPlatformStats, listPublicProfiles } from "@/lib/public-browse";
import { readJsonResponse } from "@/lib/parse-response";

const BUILD_FETCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  input: string,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUILD_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchServerDropdowns(locale: string): Promise<DropdownMap> {
  try {
    const res = await fetchWithTimeout(
      `${getApiBaseUrl()}/profiles/dropdowns?locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 3600 } },
    );
    return await readJsonResponse<DropdownMap>(res);
  } catch {
    return {};
  }
}

async function fetchMembershipTariffs(): Promise<MembershipTariff[]> {
  try {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/membership/tariffs`, {
      next: { revalidate: 60 },
    });
    return await readJsonResponse<MembershipTariff[]>(res);
  } catch {
    return [];
  }
}

async function fetchFeaturedProfiles() {
  try {
    const [male, female, stats] = await Promise.all([
      listPublicProfiles(
        { gender: "male" },
        3,
        { skipTotal: true, fetchTimeoutMs: BUILD_FETCH_TIMEOUT_MS },
      ),
      listPublicProfiles(
        { gender: "female" },
        3,
        { skipTotal: true, fetchTimeoutMs: BUILD_FETCH_TIMEOUT_MS },
      ),
      getPublicPlatformStats({
        revalidate: 60,
        fetchTimeoutMs: BUILD_FETCH_TIMEOUT_MS,
      }),
    ]);
    return {
      items: [...male.items, ...female.items].slice(0, 6),
      verifiedProfileCount: stats.verifiedProfileCount,
    };
  } catch {
    return { items: [], verifiedProfileCount: 0 };
  }
}

export const revalidate = 60;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Skip build-time API pre-render — Railway build cannot reliably reach the live API.
  await connection();

  const [dropdowns, featured, tariffs] = await Promise.all([
    fetchServerDropdowns(locale),
    fetchFeaturedProfiles(),
    fetchMembershipTariffs(),
  ]);

  return (
    <PublicMarketingHome
      dropdowns={dropdowns}
      featuredProfiles={featured.items}
      verifiedProfileCount={featured.verifiedProfileCount}
      tariffs={tariffs}
    />
  );
}
