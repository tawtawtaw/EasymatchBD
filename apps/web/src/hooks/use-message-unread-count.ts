"use client";

import { useMemberAlerts } from "@/components/MemberAlertsProvider";

/** Unread message badge from the shared alerts poll (no separate API call). */
export function useMessageUnreadCount() {
  const { summary, refresh } = useMemberAlerts();
  return {
    unreadCount: summary.unreadMessages,
    refresh: () => refresh({ forceFresh: true }),
  };
}
