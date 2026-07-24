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
import { AUTH_TOKEN_KEY, getSession, restoreDeviceSession, type AuthSession } from "@/lib/api";
import {
  AUTH_CHANGED_EVENT,
  getDeviceSession,
  notifyAuthChanged,
  setAuthToken,
  setDeviceSession,
  signOut,
} from "@/lib/auth-session";
import { useMounted } from "@/hooks/use-mounted";
import { membershipFromSession } from "@/lib/membership";
import { confirmMembershipPayment } from "@/lib/membership-checkout";

const SESSION_CLIENT_CACHE_MS = 30_000;
const MEMBERSHIP_HEAL_KEY = "easymatch_membership_heal_at";
const MEMBERSHIP_HEAL_INTERVAL_MS = 60 * 60 * 1000;
const POLL_DEFER_MS = 2_000;

let sessionClientCache: {
  token: string;
  expiresAt: number;
  value: AuthSession;
} | null = null;
let sessionInflight: Promise<AuthSession> | null = null;
let membershipHealInflight: Promise<void> | null = null;

async function healMembershipIfNeeded(
  token: string,
  session: AuthSession,
): Promise<void> {
  if (membershipFromSession(session)) return;

  const lastHealAt = Number(localStorage.getItem(MEMBERSHIP_HEAL_KEY) ?? "0");
  if (Date.now() - lastHealAt < MEMBERSHIP_HEAL_INTERVAL_MS) return;

  if (!membershipHealInflight) {
    membershipHealInflight = confirmMembershipPayment(token)
      .then((result) => {
        localStorage.setItem(MEMBERSHIP_HEAL_KEY, String(Date.now()));
        if (result.isPaidMember) {
          sessionClientCache = null;
          notifyAuthChanged();
        }
      })
      .catch(() => {
        localStorage.setItem(MEMBERSHIP_HEAL_KEY, String(Date.now()));
      })
      .finally(() => {
        membershipHealInflight = null;
      });
  }

  await membershipHealInflight;
}

async function tryRestoreFromDevice(): Promise<string | null> {
  const device = getDeviceSession();
  if (!device) return null;

  try {
    const restored = await restoreDeviceSession(
      device.phone,
      device.deviceToken,
      device.purpose,
    );
    setAuthToken(restored.accessToken);
    if (restored.deviceToken) {
      setDeviceSession(restored.deviceToken, device.phone, device.purpose);
    }
    return restored.accessToken;
  } catch {
    signOut();
    return null;
  }
}

async function loadSession(token: string): Promise<AuthSession> {
  const cached = sessionClientCache;
  if (cached && cached.token === token && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (!sessionInflight) {
    sessionInflight = getSession(token)
      .then((value) => {
        sessionClientCache = {
          token,
          expiresAt: Date.now() + SESSION_CLIENT_CACHE_MS,
          value,
        };
        return value;
      })
      .finally(() => {
        sessionInflight = null;
      });
  }

  return sessionInflight;
}

type AuthSessionContextValue = {
  loggedIn: boolean;
  user: AuthSession | null;
  ready: boolean;
  refresh: () => Promise<void>;
  pollDeferMs: number;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    let token = localStorage.getItem(AUTH_TOKEN_KEY) ?? (await tryRestoreFromDevice());

    if (!token) {
      sessionClientCache = null;
      setLoggedIn(false);
      setUser(null);
      setReady(true);
      return;
    }

    try {
      const session = await loadSession(token);
      setLoggedIn(true);
      setUser(session);
      void healMembershipIfNeeded(token, session);
    } catch {
      sessionClientCache = null;
      token = (await tryRestoreFromDevice()) ?? null;
      if (!token) {
        setLoggedIn(false);
        setUser(null);
        setReady(true);
        return;
      }

      try {
        const session = await loadSession(token);
        setLoggedIn(true);
        setUser(session);
        void healMembershipIfNeeded(token, session);
      } catch {
        signOut();
        setLoggedIn(false);
        setUser(null);
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const cached =
      token &&
      sessionClientCache &&
      sessionClientCache.token === token &&
      sessionClientCache.expiresAt > Date.now()
        ? sessionClientCache.value
        : null;

    if (cached && token) {
      setLoggedIn(true);
      setUser(cached);
      setReady(true);
      void healMembershipIfNeeded(token, cached);
      return;
    }

    setReady(false);
    void refresh();
  }, [mounted, refresh]);

  useEffect(() => {
    if (!mounted) return;

    function onAuthChanged() {
      sessionClientCache = null;
      setReady(false);
      void refresh();
    }

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    window.addEventListener("storage", onAuthChanged);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      window.removeEventListener("storage", onAuthChanged);
    };
  }, [mounted, refresh]);

  const value = useMemo(
    () => ({
      loggedIn,
      user,
      ready,
      refresh,
      pollDeferMs: POLL_DEFER_MS,
    }),
    [loggedIn, ready, refresh, user],
  );

  return (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
}

export function useAuthSessionContext() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSessionContext must be used within AuthSessionProvider");
  }
  return context;
}

export function useAuthSessionPollDeferMs() {
  return useContext(AuthSessionContext)?.pollDeferMs ?? POLL_DEFER_MS;
}
