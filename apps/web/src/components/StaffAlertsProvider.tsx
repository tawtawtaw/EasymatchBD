"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isStaffRole } from "@easymatch/shared";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { useAuthSession, useAuthSessionPollDeferMs } from "@/hooks/use-auth-session";
import { useMounted } from "@/hooks/use-mounted";
import {
  getStaffAlertsSummary,
  listStaffNotifications,
  markAllStaffNotificationsRead,
  markStaffNotificationsRead,
  type StaffAlertsSummary,
  type StaffNotificationItem,
} from "@/lib/staff-alerts";

const POLL_MS = 20_000;

type StaffAlertsContextValue = {
  summary: StaffAlertsSummary;
  notifications: StaffNotificationItem[];
  refresh: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const emptySummary: StaffAlertsSummary = {
  verificationPending: 0,
  complaintsUnassigned: 0,
  consultantCasesQueued: 0,
  deletionRequestsPending: 0,
  unreadNotifications: 0,
};

const StaffAlertsContext = createContext<StaffAlertsContextValue | null>(null);

export function StaffAlertsProvider({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const { user, loggedIn, ready } = useAuthSession();
  const pollDeferMs = useAuthSessionPollDeferMs();
  const [summary, setSummary] = useState<StaffAlertsSummary>(emptySummary);
  const [notifications, setNotifications] = useState<StaffNotificationItem[]>([]);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const isStaff = ready && loggedIn && user && isStaffRole(user.role);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !isStaff) {
      setSummary(emptySummary);
      return;
    }
    try {
      const next = await getStaffAlertsSummary(token);
      setSummary(next);
    } catch {
      /* ignore polling errors */
    }
  }, [isStaff]);

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !isStaff) {
      setNotifications([]);
      return;
    }
    try {
      const items = await listStaffNotifications(token, 20);
      setNotifications(items);
    } catch {
      /* ignore */
    }
  }, [isStaff]);

  const markRead = useCallback(
    async (ids: string[]) => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || ids.length === 0) return;
      await markStaffNotificationsRead(token, ids);
      setNotifications((current) =>
        current.map((item) =>
          ids.includes(item.id) ? { ...item, read: true } : item,
        ),
      );
      await refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    await markAllStaffNotificationsRead(token);
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (!mounted || !isStaff) {
      setPollingEnabled(false);
      setSummary(emptySummary);
      setNotifications([]);
      return;
    }

    const deferTimer = window.setTimeout(() => {
      setPollingEnabled(true);
      void refresh();
    }, pollDeferMs);

    return () => window.clearTimeout(deferTimer);
  }, [isStaff, mounted, pollDeferMs, refresh]);

  useEffect(() => {
    if (!mounted || !isStaff || !pollingEnabled) return;
    const interval = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(interval);
  }, [isStaff, mounted, pollingEnabled, refresh]);

  const value = useMemo(
    () => ({
      summary,
      notifications,
      refresh,
      loadNotifications,
      markRead,
      markAllRead,
    }),
    [summary, notifications, refresh, loadNotifications, markRead, markAllRead],
  );

  return (
    <StaffAlertsContext.Provider value={value}>{children}</StaffAlertsContext.Provider>
  );
}

export function useStaffAlerts() {
  const context = useContext(StaffAlertsContext);
  if (!context) {
    throw new Error("useStaffAlerts must be used within StaffAlertsProvider");
  }
  return context;
}
