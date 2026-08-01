"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getSession } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import { useRequireMember } from "@/hooks/use-require-member";
import {
  ConnectionItem,
  listMyConnections,
  requestPrivacyUpgrade,
  respondPrivacyUpgrade,
} from "@/lib/discovery";
import { resolveMemberDisplayName, resolveMemberDistrict } from "@/lib/member-display";
import { useMemberDiscoveryStats } from "@/hooks/use-member-discovery-stats";
import { useMemberDropdowns } from "@/hooks/use-member-dropdowns";
import { ConnectionConsultantPanel } from "@/components/ConnectionConsultantPanel";
import { ConnectionProposalsPanel } from "@/components/ConnectionProposalsPanel";
import { MIN_CONSULTANT_PRIVACY_LEVEL, MIN_VIDEO_CALL_PRIVACY_LEVEL } from "@easymatch/shared";

function connectionProfileRef(member: ConnectionItem["member"]) {
  return member.profileCode ?? member.profileId ?? "";
}

export default function ConnectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMember } = useRequireMember();
  const t = useTranslations("connections");
  const tp = useTranslations("privacy");
  const tv = useTranslations("videoCalls");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const dropdowns = useMemberDropdowns();
  const { stats: liveStats } = useMemberDiscoveryStats();
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [session, connectionList] = await Promise.all([
        getSession(token),
        listMyConnections(token),
      ]);
      if (!session.termsAccepted) {
        router.replace("/profile");
        return;
      }

      setConnections(connectionList);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  useEffect(() => {
    if (!mounted || loading || connections.length === 0) return;
    const highlightId = searchParams.get("connectionId")?.trim();
    if (!highlightId) return;
    const el = document.getElementById(`connection-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [mounted, loading, connections, searchParams]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [liveStats.connections, liveStats.incoming, liveStats.outgoing, mounted, load]);

  async function handleUpgrade(profileId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(profileId);
    setError(null);
    setMessage(null);
    try {
      const result = await requestPrivacyUpgrade(token, profileId);
      setConnections((prev) =>
        prev.map((connection) => {
          if (connectionProfileRef(connection.member) !== profileId) {
            return connection;
          }
          return {
            ...connection,
            pendingUpgradeLevel: result.pendingUpgradeLevel,
            pendingUpgradeByMe: true,
          };
        }),
      );
      setMessage(t("actions.success"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(null);
    }
  }

  async function handleRespond(profileId: string, accept: boolean) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(profileId);
    setError(null);
    setMessage(null);
    try {
      const result = await respondPrivacyUpgrade(token, profileId, accept);
      setConnections((prev) =>
        prev.map((connection) => {
          if (connectionProfileRef(connection.member) !== profileId) {
            return connection;
          }
          if (accept) {
            return {
              ...connection,
              privacyLevel: result.privacyLevel,
              pendingUpgradeLevel: null,
              pendingUpgradeByMe: false,
            };
          }
          return {
            ...connection,
            pendingUpgradeLevel: null,
            pendingUpgradeByMe: false,
          };
        }),
      );
      setMessage(t("actions.success"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(null);
    }
  }

  if (!mounted || !isMember || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (!authToken) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{t("signInRequired")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="mt-2 text-zinc-600">{t("subtitle")}</p>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <ConnectionProposalsPanel onConnectionFormed={() => void load()} />

      <h2 className="mb-4 text-lg font-semibold text-zinc-900">
        {t("connectionsListTitle")}
      </h2>

      {connections.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-zinc-600">{t("empty")}</p>
          <Link
            href="/discovery"
            className="mt-4 inline-flex rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
          >
            {t("browseDiscovery")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {connections.map((connection) => {
            const member = connection.member;
            const name = resolveMemberDisplayName(member, {
              profileRef: (code) => t("profileRef", { code }),
              anonymous: t("anonymousMember"),
            });
            const nextLevel = connection.privacyLevel + 1;
            const profileRef = connectionProfileRef(member);
            const districtLabel = resolveMemberDistrict(
              member.currentDistrict,
              dropdowns,
            );

            return (
              <li
                key={connection.connectionId}
                id={`connection-${connection.connectionId}`}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-zinc-900">{name}</h2>
                    {districtLabel ? (
                      <p className="text-sm text-zinc-500">{districtLabel}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-zinc-600">
                      {t("privacyLevel", {
                        level: connection.privacyLevel,
                        label: tp(String(connection.privacyLevel)),
                      })}
                    </p>
                  </div>
                  {profileRef ? (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/discovery/${profileRef}`}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                      >
                        {t("viewProfile")}
                      </Link>
                      <Link
                        href={`/messages/${connection.connectionId}`}
                        className="rounded-lg bg-rose-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-900"
                      >
                        {t("message")}
                      </Link>
                      {connection.privacyLevel >= MIN_VIDEO_CALL_PRIVACY_LEVEL ? (
                        <Link
                          href={`/video-calls#connection-${connection.connectionId}`}
                          className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-900 hover:bg-rose-50"
                        >
                          {tv("callNow")}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {connection.privacyLevel >= MIN_CONSULTANT_PRIVACY_LEVEL && authToken ? (
                  <ConnectionConsultantPanel
                    connectionId={connection.connectionId}
                    authToken={authToken}
                  />
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {connection.privacyLevel < 3 &&
                  !connection.pendingUpgradeLevel ? (
                    <button
                      type="button"
                      disabled={acting === profileRef || !profileRef}
                      onClick={() =>
                        profileRef && void handleUpgrade(profileRef)
                      }
                      className="rounded-lg bg-rose-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                    >
                      {t("requestUpgrade", { level: nextLevel })}
                    </button>
                  ) : null}
                  {connection.pendingUpgradeByMe &&
                  connection.pendingUpgradeLevel ? (
                    <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm text-amber-900">
                      {t("upgradePending", {
                        level: connection.pendingUpgradeLevel,
                      })}
                    </span>
                  ) : null}
                  {connection.pendingUpgradeLevel &&
                  !connection.pendingUpgradeByMe &&
                  profileRef ? (
                    <>
                      <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-sm text-blue-900">
                        {t("upgradeIncoming", {
                          level: connection.pendingUpgradeLevel,
                        })}
                      </span>
                      <button
                        type="button"
                        disabled={acting === profileRef}
                        onClick={() => void handleRespond(profileRef, true)}
                        className="rounded-lg bg-rose-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                      >
                        {t("acceptUpgrade")}
                      </button>
                      <button
                        type="button"
                        disabled={acting === profileRef}
                        onClick={() => void handleRespond(profileRef, false)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                      >
                        {t("declineUpgrade")}
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
