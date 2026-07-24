import { getApiBaseUrl } from "@/lib/api-base-url";
import { dedupeRequest, invalidateDedupeCache } from "@/lib/api";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
import type { VideoCallAlertItem } from "@/lib/video-calls";

function apiUrl() {
  return getApiBaseUrl();
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseResponse<T>(res: Response): Promise<T> {
  return readJsonResponse<T>(res);
}

export type MemberAlertsSummary = {
  unreadMessages: number;
  incomingInterests: number;
  outgoingInterests: number;
  connections: number;
  incomingCalls: number;
  incomingCallAlert: VideoCallAlertItem | null;
  callAlerts: VideoCallAlertItem[];
};

export type MemberDiscoveryStats = {
  incoming: number;
  outgoing: number;
  connections: number;
  conversations: number;
};

export function invalidateMemberDiscoveryCaches() {
  invalidateDedupeCache("alerts-summary");
  invalidateDedupeCache("discovery:home-bootstrap");
  invalidateDedupeCache("discovery-interests");
  invalidateDedupeCache("discovery-connections");
}

export async function getMemberAlertsSummary(
  token: string,
  forceFresh = false,
): Promise<MemberAlertsSummary> {
  if (forceFresh) {
    invalidateDedupeCache("alerts-summary");
  }

  return dedupeRequest(
    "alerts-summary",
    async () => {
      const res = await apiFetch(`${apiUrl()}/discovery/alerts-summary`, {
        headers: authHeaders(token),
      });
      return parseResponse<MemberAlertsSummary>(res);
    },
    12_000,
  );
}

export function toDiscoveryStats(summary: MemberAlertsSummary): MemberDiscoveryStats {
  return {
    incoming: summary.incomingInterests,
    outgoing: summary.outgoingInterests,
    connections: summary.connections,
    conversations: summary.connections,
  };
}
