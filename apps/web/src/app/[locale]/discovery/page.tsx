"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import {
  clampDiscoveryProfileLimit,
  DISCOVERY_DEFAULT_PROFILE_LIMIT,
  DISCOVERY_PROFILE_LIMIT_OPTIONS,
} from "@easymatch/shared";
import { DiscoveryFiltersPanel } from "@/components/DiscoveryFiltersPanel";
import { DiscoveryProfileCard } from "@/components/DiscoveryProfileCard";
import { ProfilePausedBanner } from "@/components/ProfilePausedBanner";
import { AUTH_TOKEN_KEY, DropdownMap, getDropdowns, getMyProfile } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useDiscoveryProfileQueue } from "@/hooks/use-discovery-profile-queue";
import { useMounted } from "@/hooks/use-mounted";
import { useRequireMember } from "@/hooks/use-require-member";
import {
  EMPTY_DISCOVERY_FILTERS,
  filtersFromPartnerPreference,
} from "@/lib/discovery-filters";
import { consumeDiscoveryProfilesLeft } from "@/lib/discovery-grid-transition";
import {
  type DiscoveryFilters,
  listDiscoveryProfiles,
} from "@/lib/discovery";
import { membershipFromSession } from "@/lib/membership";

const DISCOVERY_LIMIT_STORAGE_KEY = "easymatch_discovery_profile_limit";

function readStoredProfileLimit() {
  if (typeof window === "undefined") {
    return DISCOVERY_DEFAULT_PROFILE_LIMIT;
  }
  const raw = localStorage.getItem(DISCOVERY_LIMIT_STORAGE_KEY);
  return clampDiscoveryProfileLimit(raw ? Number(raw) : DISCOVERY_DEFAULT_PROFILE_LIMIT);
}

export default function DiscoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("discovery");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const { user: session, ready: sessionReady } = useAuthSession();
  const { isMember } = useRequireMember();
  const isPaid = membershipFromSession(session);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(
    EMPTY_DISCOVERY_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState<DiscoveryFilters>(
    EMPTY_DISCOVERY_FILTERS,
  );
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const { items, matchTotal, resetQueue, refillReserve, leaveProfiles } =
    useDiscoveryProfileQueue();
  const [profileLimit, setProfileLimit] = useState(DISCOVERY_DEFAULT_PROFILE_LIMIT);
  const [limitHydrated, setLimitHydrated] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfileLimit(readStoredProfileLimit());
    setLimitHydrated(true);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "incoming" || tab === "outgoing") {
      router.replace(`/connections?tab=${tab}`);
    }
  }, [router, searchParams]);

  const loadProfiles = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    if (!sessionReady) {
      return;
    }

    if (session && !session.termsAccepted) {
      router.replace("/profile");
      return;
    }

    if (session?.isPaused) {
      resetQueue([], 0, false);
      setLoadingProfiles(false);
      return;
    }

    setLoadingProfiles(true);
    setError(null);
    try {
      const [dd, list] = await Promise.all([
        getDropdowns(locale),
        listDiscoveryProfiles(token, 1, profileLimit, appliedFilters),
      ]);
      setDropdowns(dd);
      resetQueue(
        list.items,
        list.total,
        list.hasMore ?? list.total > list.items.length,
      );
      void refillReserve(token, profileLimit, appliedFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoadingProfiles(false);
    }
  }, [
    appliedFilters,
    locale,
    profileLimit,
    refillReserve,
    resetQueue,
    router,
    session,
    sessionReady,
    t,
  ]);

  useEffect(() => {
    if (!mounted || !limitHydrated || !sessionReady) return;
    void loadProfiles();
  }, [mounted, limitHydrated, loadProfiles, sessionReady]);

  const handleLeaveProfile = useCallback(
    (profileCode: string, reason: "pass" | "interest") => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      leaveProfiles([profileCode], profileLimit, {
        decrementTotal: reason === "interest",
        refill: token
          ? { token, filters: appliedFilters }
          : undefined,
      });
    },
    [appliedFilters, leaveProfiles, profileLimit],
  );

  useEffect(() => {
    if (!mounted || loadingProfiles) return;

    const applyLeft = () => {
      const left = consumeDiscoveryProfilesLeft();
      if (left.length === 0) return;
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      leaveProfiles(left, profileLimit, {
        decrementTotal: true,
        refill: token
          ? { token, filters: appliedFilters }
          : undefined,
      });
    };

    applyLeft();
    window.addEventListener("focus", applyLeft);
    document.addEventListener("visibilitychange", applyLeft);
    return () => {
      window.removeEventListener("focus", applyLeft);
      document.removeEventListener("visibilitychange", applyLeft);
    };
  }, [
    appliedFilters,
    leaveProfiles,
    loadingProfiles,
    mounted,
    profileLimit,
  ]);

  async function handleUseMyPreferences() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    try {
      const profile = await getMyProfile(token);
      if ("partnerPreference" in profile && profile.partnerPreference) {
        setDraftFilters(filtersFromPartnerPreference(profile.partnerPreference));
        setFiltersExpanded(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    }
  }

  function handleApplyFilters() {
    setAppliedFilters({ ...draftFilters });
    setFiltersExpanded(false);
  }

  function handleClearFilters() {
    setDraftFilters(EMPTY_DISCOVERY_FILTERS);
    setAppliedFilters(EMPTY_DISCOVERY_FILTERS);
  }

  function handleProfileLimitChange(value: string) {
    const next = clampDiscoveryProfileLimit(Number(value));
    setProfileLimit(next);
    localStorage.setItem(DISCOVERY_LIMIT_STORAGE_KEY, String(next));
  }

  if (!mounted || !isMember) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (!authToken) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{t("signInRequired")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="mt-2 text-zinc-600">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/discovery/saved"
            className="text-sm font-semibold text-rose-800 hover:underline"
          >
            {t("viewSavedProfiles")}
          </Link>
          <Link
            href="/connections"
            className="text-sm font-semibold text-rose-800 hover:underline"
          >
            {t("myConnections")}
          </Link>
        </div>
      </div>

      {session?.isPaused ? <ProfilePausedBanner className="mb-6" /> : null}

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <DiscoveryFiltersPanel
        dropdowns={dropdowns}
        draft={draftFilters}
        applied={appliedFilters}
        expanded={filtersExpanded}
        onToggle={() => setFiltersExpanded((open) => !open)}
        onDraftChange={setDraftFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        onUseMyPreferences={() => void handleUseMyPreferences()}
      />

      <section className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-medium text-zinc-900">
            {t("matchSortHint")}
          </p>
          {!loadingProfiles && matchTotal > 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              {t("resultsSummary", {
                shown: items.length,
                total: matchTotal,
              })}
            </p>
          ) : null}
          {!loadingProfiles && items.length > 0 ? (
            <p className="mt-1 text-xs text-zinc-500">{t("queueHint")}</p>
          ) : null}
        </div>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          {t("profilesToShow")}
          <select
            value={profileLimit}
            onChange={(event) => handleProfileLimitChange(event.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900"
          >
            {DISCOVERY_PROFILE_LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t("profileLimitOption", { count: option })}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loadingProfiles ? (
        <p className="text-zinc-600">{tc("loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-zinc-600">{t("noProfiles")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <DiscoveryProfileCard
              key={item.profileCode}
              token={authToken}
              item={item}
              isPaid={isPaid}
              onLeave={handleLeaveProfile}
              onActionError={setError}
            />
          ))}
        </div>
      )}
    </main>
  );
}
