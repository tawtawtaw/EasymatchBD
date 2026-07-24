import { PUBLIC_BROWSE_DEFAULT_LIMIT } from "@easymatch/shared";
import type { DiscoveryFilters } from "@/lib/discovery";
import { dedupeRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { readJsonResponse } from "@/lib/parse-response";

export type PublicBrowseMedia = {
  isVerified: boolean;
  verifiedOnBehalf: boolean;
  memberNidVerified: boolean;
};

export type PublicBrowseListItem = {
  profileId: string;
  profileCode: string;
  personal: Record<string, unknown>;
  family: Record<string, unknown> | null;
  media: PublicBrowseMedia;
  hiddenFieldCount: number;
};

export type PublicBrowseProfile = {
  profileCode: string;
  browseLevel: number;
  personal: Record<string, unknown>;
  marital: Record<string, unknown> | null;
  family: Record<string, unknown> | null;
  siblings: Record<string, unknown>[] | null;
  paternalRelatives: Record<string, unknown>[] | null;
  maternalRelatives: Record<string, unknown>[] | null;
  partner: Record<string, unknown> | null;
  media: PublicBrowseMedia;
  visibleFieldKeys: string[];
  hiddenFieldCount: number;
};

function filtersToSearchParams(
  filters: DiscoveryFilters,
  limit?: number,
  options?: { skipTotal?: boolean },
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  if (limit != null) {
    params.set("limit", String(limit));
  }
  if (options?.skipTotal) {
    params.set("skipTotal", "1");
  }
  return params;
}

export type PublicPlatformStats = {
  verifiedProfileCount: number;
};

export async function getPublicPlatformStats(options?: {
  revalidate?: number;
}): Promise<PublicPlatformStats> {
  if (options?.revalidate != null) {
    const res = await fetch(`${getApiBaseUrl()}/public/stats`, {
      next: { revalidate: options.revalidate },
    });
    return readJsonResponse(res);
  }

  return dedupeRequest(
    "public-platform-stats",
    async () => {
      const res = await fetch(`${getApiBaseUrl()}/public/stats`, {
        cache: "no-store",
      });
      return readJsonResponse<PublicPlatformStats>(res);
    },
    60_000,
  );
}

export async function listPublicProfiles(
  filters: DiscoveryFilters,
  limit = PUBLIC_BROWSE_DEFAULT_LIMIT,
  options?: { skipTotal?: boolean },
): Promise<{
  items: PublicBrowseListItem[];
  total: number;
  limit: number;
  browseLevel: number;
}> {
  const params = filtersToSearchParams(filters, limit, options);
  const res = await fetch(
    `${getApiBaseUrl()}/public/profiles?${params.toString()}`,
    { next: { revalidate: 30 } },
  );
  return readJsonResponse(res);
}

export async function getPublicProfile(
  profileCode: string,
): Promise<PublicBrowseProfile> {
  const res = await fetch(
    `${getApiBaseUrl()}/public/profiles/${encodeURIComponent(profileCode)}`,
    { next: { revalidate: 30 } },
  );
  return readJsonResponse(res);
}

export function publicBrowseSearchHref(filters: DiscoveryFilters) {
  const params = filtersToSearchParams(filters);
  const query = params.toString();
  return query ? `/browse?${query}` : "/browse";
}

export function displayPublicName(personal: Record<string, unknown>) {
  const name = personal.full_name;
  if (typeof name === "string" && name.trim()) return name;
  return null;
}
