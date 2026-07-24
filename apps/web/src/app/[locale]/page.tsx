import type { MembershipTariff } from "@easymatch/shared";
import { setRequestLocale } from "next-intl/server";
import type { DropdownMap } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { PublicMarketingHome } from "@/components/PublicMarketingHome";
import { getPublicPlatformStats, listPublicProfiles } from "@/lib/public-browse";
import { readJsonResponse } from "@/lib/parse-response";

async function fetchServerDropdowns(locale: string): Promise<DropdownMap> {
  try {
    const res = await fetch(
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
    const res = await fetch(`${getApiBaseUrl()}/membership/tariffs`, {
      next: { revalidate: 3600 },
    });
    return await readJsonResponse<MembershipTariff[]>(res);
  } catch {
    return [];
  }
}

async function fetchFeaturedProfiles() {
  try {
    const [male, female, stats] = await Promise.all([
      listPublicProfiles({ gender: "male" }, 3, { skipTotal: true }),
      listPublicProfiles({ gender: "female" }, 3, { skipTotal: true }),
      getPublicPlatformStats({ revalidate: 60 }),
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
