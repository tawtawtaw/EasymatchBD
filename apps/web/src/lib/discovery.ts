import { EASYMATCH_API_URL } from "@easymatch/shared";
import { dedupeRequest, invalidateDedupeCache } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

function apiUrl(): string {
  return typeof window !== "undefined" ? getApiBaseUrl() : API_URL;
}

async function parseResponse<T>(res: Response): Promise<T> {
  return readJsonResponse<T>(res);
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export type DiscoveryMedia = {
  primaryPhotoId: string | null;
  galleryPhotoIds: string[];
  isVerified: boolean;
  verifiedOnBehalf: boolean;
  memberNidVerified: boolean;
  phone: string | null;
};

export type CompatibilitySummary = {
  score: number;
  matchedCount: number;
  totalCriteria: number;
};

export type DiscoveryListItem = {
  profileId: string;
  profileCode: string;
  userId: string;
  viewerPrivacyLevel: number;
  relationshipStatus: "none" | "interest_sent" | "interest_received" | "connected";
  personal: Record<string, unknown>;
  media: DiscoveryMedia;
  hiddenFieldCount: number;
  compatibility: CompatibilitySummary;
  /** Derived server-side, so it survives the date of birth being privacy-gated. */
  age?: number | null;
  isBookmarked?: boolean;
};

export type ConnectionItem = {
  connectionId: string;
  privacyLevel: number;
  pendingUpgradeLevel: number | null;
  pendingUpgradeByMe: boolean;
  updatedAt: string;
  member: {
    userId: string;
    profileId: string | null;
    profileCode: string | null;
    fullName: string | null;
    gender: string | null;
    currentDistrict: string | null;
    currentDivision: string | null;
    isVerified: boolean;
    isPaused?: boolean;
  };
};

export type DiscoveryFilters = {
  profileCode?: string;
  gender?: string;
  division?: string;
  district?: string;
  maritalStatus?: string;
  religion?: string;
  complexion?: string;
  education?: string;
  occupation?: string;
  incomeRange?: string;
  ageMin?: string;
  ageMax?: string;
  heightMinCm?: string;
  heightMaxCm?: string;
  weightMinKg?: string;
  weightMaxKg?: string;
  hasDisability?: string;
  familyType?: string;
  familyStatus?: string;
};

const FILTER_QUERY_KEYS: (keyof DiscoveryFilters)[] = [
  "profileCode",
  "gender",
  "division",
  "district",
  "maritalStatus",
  "religion",
  "complexion",
  "education",
  "occupation",
  "incomeRange",
  "ageMin",
  "ageMax",
  "heightMinCm",
  "heightMaxCm",
  "weightMinKg",
  "weightMaxKg",
  "hasDisability",
  "familyType",
  "familyStatus",
];

export type DiscoveryRelationship = {
  status: "self" | "none" | "interest_sent" | "interest_received" | "connected";
  viewerPrivacyLevel: number;
  connectionId?: string | null;
  connectionPrivacyLevel: number | null;
  pendingUpgradeLevel: number | null;
  pendingUpgradeByMe: boolean;
  sentInterestId?: string | null;
  receivedInterestId?: string | null;
  partnerIsPaused?: boolean;
  reconnectAvailableAt?: string | null;
};

export type DiscoveryProfile = {
  profileId: string;
  profileCode: string;
  userId: string;
  viewerPrivacyLevel: number;
  relationship: DiscoveryRelationship;
  compatibility: CompatibilitySummary;
  personal: Record<string, unknown>;
  marital: Record<string, unknown> | null;
  family: Record<string, unknown> | null;
  siblings: Record<string, unknown>[] | null;
  paternalRelatives: Record<string, unknown>[] | null;
  maternalRelatives: Record<string, unknown>[] | null;
  partner: Record<string, unknown> | null;
  media: DiscoveryMedia;
  visibleFieldKeys: string[];
  hiddenFieldCount: number;
  isBookmarked?: boolean;
};

export type InterestProfileSummary = {
  id: string;
  profileCode: string | null;
  fullName: string | null;
  gender: string | null;
  currentDistrict: string | null;
  currentDivision?: string | null;
  isVerified: boolean;
};

export type IncomingInterest = {
  id: string;
  createdAt: string;
  disclosureLevel: number;
  sender: {
    id: string;
    profile: InterestProfileSummary | null;
  };
};

export type OutgoingInterest = {
  id: string;
  createdAt: string;
  disclosureLevel: number;
  receiver: {
    id: string;
    profile: InterestProfileSummary | null;
  };
};

export type SavedProfileItem = DiscoveryListItem & {
  bookmarkId: string;
  savedAt: string;
};

export async function listSavedProfiles(token: string) {
  const res = await apiFetch(`${apiUrl()}/discovery/bookmarks`, {
    headers: authHeaders(token),
  });
  return parseResponse<SavedProfileItem[]>(res);
}

export async function saveProfileBookmark(token: string, profileId: string) {
  const res = await apiFetch(
    `${apiUrl()}/discovery/profiles/${encodeURIComponent(profileId)}/bookmark`,
    { method: "POST", headers: authHeaders(token) },
  );
  return parseResponse<{ id: string; profileId: string; savedAt: string }>(res);
}

export async function removeProfileBookmark(token: string, profileId: string) {
  const res = await apiFetch(
    `${apiUrl()}/discovery/profiles/${encodeURIComponent(profileId)}/bookmark`,
    { method: "DELETE", headers: authHeaders(token) },
  );
  return parseResponse<{ removed: boolean; profileId: string }>(res);
}

export type MemberHomeBootstrap = {
  termsAccepted: boolean;
  profile: {
    fullName: string | null;
    profileCode: string | null;
    isVerified: boolean;
    completionPercent: number;
    primaryPhotoId: string | null;
  };
  stats: {
    incoming: number;
    outgoing: number;
    connections: number;
    conversations: number;
  };
  suggestions: DiscoveryListItem[];
};

export async function getMemberHomeBootstrap(token: string) {
  return dedupeRequest(
    `discovery:home-bootstrap:${token}`,
    async () =>
      parseResponse<MemberHomeBootstrap>(
        await apiFetch(`${apiUrl()}/discovery/home-bootstrap`, {
          headers: authHeaders(token),
        }),
      ),
    30_000,
  );
}

export async function listDiscoveryProfiles(
  token: string,
  page = 1,
  limit = 20,
  filters: DiscoveryFilters = {},
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  for (const key of FILTER_QUERY_KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }

  const res = await apiFetch(`${apiUrl()}/discovery/profiles?${params}`, {
    headers: authHeaders(token),
  });
  return parseResponse<{
    items: DiscoveryListItem[];
    total: number;
    page: number;
    limit: number;
    hasMore?: boolean;
  }>(res);
}

export async function getDiscoveryProfile(token: string, profileId: string) {
  return dedupeRequest(
    `discovery-profile:${profileId}`,
    async () => {
      const res = await apiFetch(`${apiUrl()}/discovery/profiles/${profileId}`, {
        headers: authHeaders(token),
      });
      return parseResponse<DiscoveryProfile>(res);
    },
    30_000,
  );
}

export async function sendDiscoveryInterest(token: string, profileId: string) {
  const res = await apiFetch(
    `${apiUrl()}/discovery/profiles/${profileId}/interest`,
    { method: "POST", headers: authHeaders(token) },
  );
  invalidateDedupeCache("discovery-interests");
  invalidateDedupeCache("discovery:home-bootstrap");
  invalidateDedupeCache("alerts-summary");
  invalidateDedupeCache(`discovery-profile:${profileId}`);
  invalidateDedupeCache(`discovery-comparison:${profileId}`);
  return parseResponse<{ mutual: boolean; status: string }>(res);
}

export async function respondDiscoveryInterest(
  token: string,
  interestId: string,
  accept: boolean,
) {
  const res = await apiFetch(
    `${apiUrl()}/discovery/interests/${interestId}/respond`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ accept }),
    },
  );
  invalidateDedupeCache("discovery-interests");
  invalidateDedupeCache("discovery-connections");
  invalidateDedupeCache("discovery:home-bootstrap");
  invalidateDedupeCache("alerts-summary");
  return parseResponse<{ status: string }>(res);
}

export async function listMyConnections(token: string) {
  const res = await apiFetch(`${apiUrl()}/discovery/connections`, {
    headers: authHeaders(token),
  });
  return parseResponse<ConnectionItem[]>(res);
}

function sanitizeIncomingInterest(item: IncomingInterest): IncomingInterest {
  const profile = item.sender.profile;
  if (!profile) return item;
  return {
    ...item,
    sender: {
      ...item.sender,
      profile: {
        ...profile,
        fullName: null,
      },
    },
  };
}

function sanitizeOutgoingInterest(item: OutgoingInterest): OutgoingInterest {
  const profile = item.receiver.profile;
  if (!profile) return item;
  return {
    ...item,
    receiver: {
      ...item.receiver,
      profile: {
        ...profile,
        fullName: null,
      },
    },
  };
}

export async function listInterests(token: string) {
  return dedupeRequest(
    "discovery-interests",
    async () => {
      const res = await apiFetch(`${apiUrl()}/discovery/interests`, {
        headers: authHeaders(token),
      });
      const data = await parseResponse<{
        incoming: IncomingInterest[];
        outgoing: OutgoingInterest[];
      }>(res);
      return {
        incoming: data.incoming.map(sanitizeIncomingInterest),
        outgoing: data.outgoing.map(sanitizeOutgoingInterest),
      };
    },
    15_000,
  );
}

export async function listIncomingInterests(token: string) {
  const res = await apiFetch(`${apiUrl()}/discovery/interests/incoming`, {
    headers: authHeaders(token),
  });
  const items = await parseResponse<IncomingInterest[]>(res);
  return items.map(sanitizeIncomingInterest);
}

export async function listOutgoingInterests(token: string) {
  const res = await apiFetch(`${apiUrl()}/discovery/interests/outgoing`, {
    headers: authHeaders(token),
  });
  const items = await parseResponse<OutgoingInterest[]>(res);
  return items.map(sanitizeOutgoingInterest);
}

export async function withdrawDiscoveryInterest(
  token: string,
  interestId: string,
) {
  const res = await apiFetch(`${apiUrl()}/discovery/interests/${interestId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  invalidateDedupeCache("discovery-interests");
  invalidateDedupeCache("discovery:home-bootstrap");
  invalidateDedupeCache("alerts-summary");
  return parseResponse<{ withdrawn: boolean }>(res);
}

export async function requestPrivacyUpgrade(token: string, profileId: string) {
  const res = await apiFetch(
    `${apiUrl()}/discovery/profiles/${profileId}/privacy-upgrade/request`,
    { method: "POST", headers: authHeaders(token) },
  );
  invalidateDedupeCache("discovery-connections");
  invalidateDedupeCache(`discovery-profile:${profileId}`);
  return parseResponse<{ pendingUpgradeLevel: number }>(res);
}

export async function respondPrivacyUpgrade(
  token: string,
  profileId: string,
  accept: boolean,
) {
  const res = await apiFetch(
    `${apiUrl()}/discovery/profiles/${profileId}/privacy-upgrade/respond`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ accept }),
    },
  );
  invalidateDedupeCache("discovery-connections");
  invalidateDedupeCache(`discovery-profile:${profileId}`);
  return parseResponse<{ privacyLevel: number; accepted: boolean }>(res);
}

export async function endConnection(token: string, connectionId: string) {
  const res = await apiFetch(
    `${apiUrl()}/discovery/connections/${encodeURIComponent(connectionId)}/end`,
    { method: "POST", headers: authHeaders(token) },
  );
  invalidateDedupeCache("discovery-connections");
  invalidateDedupeCache("discovery-interests");
  invalidateDedupeCache("discovery:home-bootstrap");
  invalidateDedupeCache("alerts-summary");
  invalidateDedupeCache("discovery-profile");
  invalidateDedupeCache("discovery-comparison");
  return parseResponse<{
    ended: boolean;
    connectionId: string;
    otherUserId: string;
  }>(res);
}

export function discoveryPhotoUrl(
  profileId: string,
  photoId: string,
  variant?: "thumb" | "display" | "original",
) {
  const base = `/discovery/profiles/${profileId}/photos/${photoId}/file`;
  if (!variant || variant === "original") return base;
  return `${base}?variant=${variant}`;
}

export async function fetchDiscoveryBlob(
  token: string,
  profileId: string,
  photoId: string,
  variant: "thumb" | "display" | "original" = "original",
): Promise<Blob> {
  return dedupeRequest(
    `discovery-photo:${profileId}:${photoId}:${variant}`,
    async () => {
      const res = await apiFetch(
        `${apiUrl()}${discoveryPhotoUrl(profileId, photoId, variant)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to load photo");
      return res.blob();
    },
    60_000,
  );
}
