import { isValidProfileCode, normalizeProfileCode } from "@easymatch/shared";
import { API_BASE_URL, apiRequest } from "./api/client";
import { dedupeRequest, invalidateDedupeCache } from "./api/dedupe";
import type { DiscoveryFilters } from "../types/discovery-filters";
import { filtersToSearchParams } from "../lib/discovery-filters";
import type {
  ConnectionItem,
  DiscoveryListItem,
  DiscoveryProfile,
  IncomingInterest,
  MemberHomeBootstrap,
  OutgoingInterest,
  SavedProfileItem,
} from "../types/discovery";

function normalizeMemberHomeBootstrap(raw: MemberHomeBootstrap): MemberHomeBootstrap {
  return {
    termsAccepted: raw.termsAccepted ?? false,
    profile: {
      fullName: raw.profile?.fullName ?? null,
      profileCode: raw.profile?.profileCode ?? null,
      isVerified: raw.profile?.isVerified ?? false,
      completionPercent: raw.profile?.completionPercent ?? 0,
      primaryPhotoId: raw.profile?.primaryPhotoId ?? null,
    },
    stats: {
      incoming: raw.stats?.incoming ?? 0,
      outgoing: raw.stats?.outgoing ?? 0,
      connections: raw.stats?.connections ?? 0,
      conversations: raw.stats?.conversations ?? 0,
    },
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions : [],
  };
}

export async function getMemberHomeBootstrap() {
  return dedupeRequest(
    "discovery:home-bootstrap",
    async () => {
      const data = await apiRequest<MemberHomeBootstrap>("/discovery/home-bootstrap");
      return normalizeMemberHomeBootstrap(data);
    },
    30_000,
  );
}

export async function listDiscoveryProfiles(
  page = 1,
  limit = 20,
  filters: DiscoveryFilters = {},
  options?: { forceFresh?: boolean },
) {
  const params = filtersToSearchParams(filters, page, limit);
  const cacheKey = `discovery:list:${params.toString()}`;
  if (options?.forceFresh) {
    invalidateDedupeCache(cacheKey);
  }
  return dedupeRequest(
    cacheKey,
    () =>
      apiRequest<{
        items: DiscoveryListItem[];
        total: number;
        page: number;
        limit: number;
      }>(`/discovery/profiles?${params.toString()}`),
    20_000,
  );
}

export async function getDiscoveryProfile(
  profileId: string,
  options?: { forceFresh?: boolean },
) {
  const cacheKey = `discovery-profile:${profileId}`;
  if (options?.forceFresh) {
    invalidateDedupeCache(cacheKey);
  }
  return dedupeRequest(
    cacheKey,
    () =>
      apiRequest<DiscoveryProfile>(
        `/discovery/profiles/${encodeURIComponent(profileId)}`,
      ),
    30_000,
  );
}

/**
 * The list endpoint hides anyone the viewer already has a pending interest or a
 * connection with, so searching their code there returns nothing. A code is a
 * request for one specific person, so fall back to the lookup that does show
 * them rather than reporting that they do not exist.
 */
export async function findDiscoveryProfileByCode(
  profileCode: string,
): Promise<DiscoveryListItem | null> {
  if (!isValidProfileCode(profileCode)) return null;

  try {
    const profile = await getDiscoveryProfile(normalizeProfileCode(profileCode));
    if (profile.relationship.status === "self") return null;

    return {
      profileId: profile.profileId,
      profileCode: profile.profileCode,
      userId: profile.userId,
      viewerPrivacyLevel: profile.viewerPrivacyLevel,
      relationshipStatus: profile.relationship.status,
      personal: profile.personal,
      media: profile.media,
      hiddenFieldCount: profile.hiddenFieldCount,
      compatibility: profile.compatibility,
      isBookmarked: profile.isBookmarked,
    };
  } catch {
    // A code nobody visible holds is just an empty result, not an error.
    return null;
  }
}

export async function sendDiscoveryInterest(profileId: string) {
  const result = await apiRequest<{ mutual: boolean; status: string }>(
    `/discovery/profiles/${encodeURIComponent(profileId)}/interest`,
    { method: "POST" },
  );
  invalidateDedupeCache("discovery-interests");
  invalidateDedupeCache("discovery:home-bootstrap");
  invalidateDedupeCache("alerts-summary");
  invalidateDedupeCache("discovery:list:");
  invalidateDedupeCache(`discovery-profile:${profileId}`);
  invalidateDedupeCache(`discovery-comparison:${profileId}`);
  return result;
}

export async function respondDiscoveryInterest(interestId: string, accept: boolean) {
  const result = await apiRequest<{ status: string }>(
    `/discovery/interests/${encodeURIComponent(interestId)}/respond`,
    {
      method: "POST",
      body: JSON.stringify({ accept }),
    },
  );
  invalidateDedupeCache("discovery-interests");
  invalidateDedupeCache("discovery-connections");
  invalidateDedupeCache("discovery:home-bootstrap");
  invalidateDedupeCache("alerts-summary");
  return result;
}

export async function listInterests(options?: { forceFresh?: boolean }) {
  if (options?.forceFresh) {
    invalidateDedupeCache("discovery-interests");
  }
  return dedupeRequest(
    "discovery-interests",
    () =>
      apiRequest<{
        incoming: IncomingInterest[];
        outgoing: OutgoingInterest[];
      }>("/discovery/interests"),
    15_000,
  );
}

export async function listMyConnections() {
  return dedupeRequest(
    "discovery-connections",
    () => apiRequest<ConnectionItem[]>("/discovery/connections"),
    15_000,
  );
}

export async function requestPrivacyUpgrade(profileIdOrCode: string) {
  const result = await apiRequest<{ pendingUpgradeLevel: number }>(
    `/discovery/profiles/${encodeURIComponent(profileIdOrCode)}/privacy-upgrade/request`,
    { method: "POST" },
  );
  invalidateDedupeCache("discovery-connections");
  invalidateDedupeCache(`discovery-profile:${profileIdOrCode}`);
  invalidateDedupeCache("alerts-summary");
  return result;
}

export async function respondPrivacyUpgrade(profileIdOrCode: string, accept: boolean) {
  const result = await apiRequest<{ privacyLevel: number; accepted: boolean }>(
    `/discovery/profiles/${encodeURIComponent(profileIdOrCode)}/privacy-upgrade/respond`,
    {
      method: "POST",
      body: JSON.stringify({ accept }),
    },
  );
  invalidateDedupeCache("discovery-connections");
  invalidateDedupeCache(`discovery-profile:${profileIdOrCode}`);
  invalidateDedupeCache("alerts-summary");
  return result;
}

export async function withdrawDiscoveryInterest(interestId: string) {
  const result = await apiRequest<{ withdrawn: boolean }>(
    `/discovery/interests/${encodeURIComponent(interestId)}`,
    { method: "DELETE" },
  );
  invalidateDedupeCache("discovery-interests");
  invalidateDedupeCache("discovery:home-bootstrap");
  return result;
}

export function discoveryPhotoUrl(profileId: string, photoId: string) {
  return `${API_BASE_URL}/discovery/profiles/${encodeURIComponent(profileId)}/photos/${encodeURIComponent(photoId)}/file`;
}

export async function listSavedProfiles(options?: { forceFresh?: boolean }) {
  if (options?.forceFresh) {
    invalidateDedupeCache("discovery:bookmarks");
  }
  return dedupeRequest(
    "discovery:bookmarks",
    () => apiRequest<SavedProfileItem[]>("/discovery/bookmarks"),
    15_000,
  );
}

export async function saveProfileBookmark(profileIdOrCode: string) {
  return apiRequest<{ id: string; profileId: string; savedAt: string }>(
    `/discovery/profiles/${encodeURIComponent(profileIdOrCode)}/bookmark`,
    { method: "POST" },
  );
}

export async function removeProfileBookmark(profileIdOrCode: string) {
  return apiRequest<{ removed: boolean; profileId: string }>(
    `/discovery/profiles/${encodeURIComponent(profileIdOrCode)}/bookmark`,
    { method: "DELETE" },
  );
}
