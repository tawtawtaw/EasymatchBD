"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getSession } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import { useRequireMember } from "@/hooks/use-require-member";
import { useAuthSession } from "@/hooks/use-auth-session";
import { membershipFromSession } from "@/lib/membership";
import { PaidMembershipRequired } from "@/components/PaidMembershipRequired";
import { ConnectionItem, listMyConnections } from "@/lib/discovery";
import { resolveMemberDisplayName, resolveMemberDistrict } from "@/lib/member-display";
import { useMemberDropdowns } from "@/hooks/use-member-dropdowns";
import {
  createVideoCall,
  formatVideoCallWhen,
  listVideoCallAlerts,
  startScheduledVideoCall,
  type VideoCallAlertItem,
} from "@/lib/video-calls";
import { unlockVideoCallRingtone } from "@/lib/video-call-ringtone";
import { MIN_VIDEO_CALL_PRIVACY_LEVEL } from "@easymatch/shared";

export default function VideoCallsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("videoCalls.hub");
  const tv = useTranslations("videoCalls");
  const tc = useTranslations("common");
  const tp = useTranslations("privacy");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const dropdowns = useMemberDropdowns();
  const { user: session, ready: sessionReady } = useAuthSession();
  const { isMember } = useRequireMember();
  const isPaid = membershipFromSession(session);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [alerts, setAlerts] = useState<VideoCallAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [joiningAlertId, setJoiningAlertId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    setError(null);
    try {
      const [sessionData, connectionList, alertList] = await Promise.all([
        getSession(token),
        listMyConnections(token),
        listVideoCallAlerts(token).catch(() => [] as VideoCallAlertItem[]),
      ]);

      if (!sessionData.termsAccepted) {
        router.replace("/profile");
        return;
      }

      setConnections(connectionList);
      setAlerts(alertList);
    } catch (err) {
      setError(err instanceof Error ? err.message : tv("actions.error"));
    } finally {
      setLoading(false);
    }
  }, [router, tv]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.startsWith("connection-")) return;
    const el = document.getElementById(hash);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading]);

  async function handleCallNow(connectionId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setCallingId(connectionId);
    setError(null);
    try {
      unlockVideoCallRingtone();
      const call = await createVideoCall(token, connectionId);
      router.push(
        `/messages/${connectionId}/call?callId=${encodeURIComponent(call.id)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tv("actions.error"));
    } finally {
      setCallingId(null);
    }
  }

  async function handleAlertAction(alert: VideoCallAlertItem) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    unlockVideoCallRingtone();
    setJoiningAlertId(alert.call.id);

    try {
      if (alert.kind === "scheduled_starting") {
        await startScheduledVideoCall(token, alert.call.id);
      }
      router.push(
        `/messages/${alert.call.connectionId}/call?callId=${encodeURIComponent(alert.call.id)}`,
      );
    } catch {
      router.push(
        `/messages/${alert.call.connectionId}/call?callId=${encodeURIComponent(alert.call.id)}`,
      );
    } finally {
      setJoiningAlertId(null);
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
        <p className="text-zinc-600">{tv("signInRequired")}</p>
      </main>
    );
  }

  if (sessionReady && !isPaid) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PaidMembershipRequired feature="videoCalls" />
      </main>
    );
  }

  const eligible = connections.filter(
    (c) => c.privacyLevel >= MIN_VIDEO_CALL_PRIVACY_LEVEL,
  );
  const needsUpgrade = connections.filter(
    (c) => c.privacyLevel < MIN_VIDEO_CALL_PRIVACY_LEVEL,
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <Link
          href="/home"
          className="text-sm font-medium text-rose-800 hover:text-rose-900"
        >
          {t("backToHome")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="mt-2 text-zinc-600">{t("subtitle")}</p>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {alerts.length > 0 ? (
        <section className="mb-8 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t("activeSection")}
          </h2>
          {alerts.map((alert) => {
            const partner =
              alert.partnerName?.trim() || tv("unknownMember");
            const when = alert.call.scheduledAt
              ? formatVideoCallWhen(alert.call.scheduledAt, locale)
              : "";
            const messageKey =
              alert.kind === "incoming"
                ? "alerts.incoming"
                : alert.kind === "scheduled_starting"
                  ? "alerts.starting"
                  : alert.kind === "scheduled_reminder"
                    ? "alerts.reminder"
                    : "alerts.partnerScheduled";
            const actionLabel =
              alert.kind === "incoming"
                ? tv("answer")
                : alert.kind === "scheduled_starting"
                  ? joiningAlertId === alert.call.id
                    ? tv("joiningScheduled")
                    : tv("joinScheduled")
                  : tv("openCall");

            return (
              <div
                key={`${alert.kind}-${alert.call.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3"
              >
                <p className="text-sm font-medium text-emerald-950">
                  {tv(messageKey, { partner, when })}
                </p>
                <button
                  type="button"
                  disabled={joiningAlertId === alert.call.id}
                  onClick={() => void handleAlertAction(alert)}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  {actionLabel}
                </button>
              </div>
            );
          })}
        </section>
      ) : null}

      {eligible.length === 0 && needsUpgrade.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-zinc-600">{t("empty")}</p>
          <Link
            href="/connections"
            className="mt-4 inline-flex rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
          >
            {t("browseConnections")}
          </Link>
        </div>
      ) : (
        <>
          {eligible.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {t("connectionsSection")}
              </h2>
              <ul className="space-y-3">
                {eligible.map((connection) => {
                  const name = resolveMemberDisplayName(connection.member, {
                    profileRef: (code) => tv("profileRef", { code }),
                    anonymous: tv("unknownMember"),
                  });
                  const calling = callingId === connection.connectionId;
                  const districtLabel = resolveMemberDistrict(
                    connection.member.currentDistrict,
                    dropdowns,
                  );

                  return (
                    <li
                      key={connection.connectionId}
                      id={`connection-${connection.connectionId}`}
                      className="rounded-2xl border border-rose-200 border-l-4 border-l-rose-600 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-zinc-900">{name}</h3>
                          {districtLabel ? (
                            <p className="text-sm text-zinc-500">{districtLabel}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-zinc-600">
                            {tp(String(connection.privacyLevel))}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={calling}
                            onClick={() =>
                              void handleCallNow(connection.connectionId)
                            }
                            className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                          >
                            {calling ? t("calling") : tv("callNow")}
                          </button>
                          <Link
                            href={`/messages/${connection.connectionId}`}
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                          >
                            {t("scheduleAndChat")}
                          </Link>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-zinc-500">
                        {t("scheduleHint")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {needsUpgrade.length > 0 ? (
            <section className="mt-8 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {t("upgradeSection")}
              </h2>
              <p className="text-sm text-zinc-600">{t("upgradeHint")}</p>
              <ul className="space-y-2">
                {needsUpgrade.map((connection) => {
                  const name = resolveMemberDisplayName(connection.member, {
                    profileRef: (code) => tv("profileRef", { code }),
                    anonymous: tv("unknownMember"),
                  });
                  return (
                    <li
                      key={connection.connectionId}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
                    >
                      <span className="font-medium text-zinc-900">{name}</span>
                      {" — "}
                      {tv("levelRequired", {
                        level: MIN_VIDEO_CALL_PRIVACY_LEVEL,
                      })}
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/connections"
                className="inline-flex text-sm font-semibold text-rose-800 hover:text-rose-900"
              >
                {t("managePrivacy")} →
              </Link>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
