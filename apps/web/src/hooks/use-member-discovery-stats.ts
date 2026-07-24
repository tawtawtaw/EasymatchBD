"use client";

import { toDiscoveryStats } from "@/lib/member-alerts";
import { useMemberAlerts } from "@/components/MemberAlertsProvider";

/** Live connection/interest counts from the shared alerts poll. */
export function useMemberDiscoveryStats() {
  const { summary, refresh } = useMemberAlerts();
  return {
    stats: toDiscoveryStats(summary),
    refresh: () => refresh({ forceFresh: true }),
  };
}
