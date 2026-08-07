"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { useMemberAlerts } from "@/components/MemberAlertsProvider";
import { unlockVideoCallRingtone } from "@/lib/video-call-ringtone";
import {
  formatVideoCallWhen,
  startScheduledVideoCall,
  type VideoCallAlertItem,
  type VideoCallAlertKind,
} from "@/lib/video-calls";

const DISMISS_PREFIX = "easymatch_video_call_alert_dismiss_";

function dismissKey(alert: VideoCallAlertItem) {
  return `${DISMISS_PREFIX}${alert.kind}_${alert.call.id}_${alert.call.updatedAt}`;
}

function isDismissed(alert: VideoCallAlertItem) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(dismissKey(alert)) === "1";
}

function canDismiss(kind: VideoCallAlertKind) {
  return kind === "scheduled_partner" || kind === "scheduled_reminder";
}

type VideoCallAlertsBannerProps = {
  variant?: "inline" | "global";
};

export function VideoCallAlertsBanner({
  variant = "inline",
}: VideoCallAlertsBannerProps) {
  const t = useTranslations("videoCalls");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { summary } = useMemberAlerts();
  const [dismissedVersion, setDismissedVersion] = useState(0);
  const [joiningCallId, setJoiningCallId] = useState<string | null>(null);

  const visibleAlerts = useMemo(() => {
    void dismissedVersion;
    if (pathname.includes("/video-calls")) return [];

    return (summary.callAlerts ?? []).filter((alert) => {
      if (isDismissed(alert)) return false;
      if (alert.kind === "incoming") return false;
      return true;
    });
  }, [dismissedVersion, pathname, summary.callAlerts]);

  const hasIncomingAlert = visibleAlerts.some(
    (alert) => alert.kind === "incoming",
  );
  void hasIncomingAlert;

  const dismiss = useCallback((alert: VideoCallAlertItem) => {
    localStorage.setItem(dismissKey(alert), "1");
    setDismissedVersion((v) => v + 1);
  }, []);

  const joinScheduledCall = useCallback(
    async (alert: VideoCallAlertItem) => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      setJoiningCallId(alert.call.id);
      try {
        unlockVideoCallRingtone();
        await startScheduledVideoCall(token, alert.call.id);
        router.push(
          `/messages/${alert.call.connectionId}/call?callId=${encodeURIComponent(alert.call.id)}`,
        );
      } catch {
        router.push(
          `/messages/${alert.call.connectionId}/call?callId=${encodeURIComponent(alert.call.id)}`,
        );
      } finally {
        setJoiningCallId(null);
      }
    },
    [router],
  );

  if (visibleAlerts.length === 0) return null;

  const wrapperClass =
    variant === "global"
      ? "border-b border-zinc-200 bg-white"
      : "mb-4 space-y-2";

  const innerClass =
    variant === "global"
      ? "mx-auto max-w-5xl space-y-2 px-4 py-3 sm:px-6"
      : "space-y-2";

  return (
    <div className={wrapperClass} role="region" aria-label={t("alerts.regionLabel")}>
      <div className={innerClass}>
        {visibleAlerts.map((alert) => {
          const partner =
            alert.partnerName?.trim() || t("unknownMember");
          const when = alert.call.scheduledAt
            ? formatVideoCallWhen(alert.call.scheduledAt, locale)
            : "";

          const styles: Record<
            VideoCallAlertKind,
            { border: string; bg: string; text: string; button: string }
          > = {
            incoming: {
              border: "border-emerald-300",
              bg: "bg-emerald-50",
              text: "text-emerald-900",
              button: "bg-emerald-700 hover:bg-emerald-600",
            },
            scheduled_starting: {
              border: "border-rose-300",
              bg: "bg-rose-50",
              text: "text-rose-900",
              button: "bg-rose-800 hover:bg-rose-900",
            },
            scheduled_reminder: {
              border: "border-amber-300",
              bg: "bg-amber-50",
              text: "text-amber-950",
              button: "bg-amber-800 hover:bg-amber-900",
            },
            scheduled_partner: {
              border: "border-sky-300",
              bg: "bg-sky-50",
              text: "text-sky-950",
              button: "bg-sky-800 hover:bg-sky-900",
            },
          };

          const style = styles[alert.kind];
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
              ? t("answer")
              : alert.kind === "scheduled_starting"
                ? joiningCallId === alert.call.id
                  ? t("joiningScheduled")
                  : t("joinScheduled")
                : t("openChat");

          const href =
            alert.kind === "incoming"
              ? `/messages/${alert.call.connectionId}/call?callId=${encodeURIComponent(alert.call.id)}&autoJoin=1`
              : `/messages/${alert.call.connectionId}`;

          return (
            <div
              key={`${alert.kind}-${alert.call.id}`}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${style.border} ${style.bg}`}
            >
              <p className={`text-sm font-medium ${style.text}`}>
                {t(messageKey, { partner, when })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {canDismiss(alert.kind) ? (
                  <button
                    type="button"
                    onClick={() => dismiss(alert)}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-white/70"
                  >
                    {t("alerts.dismiss")}
                  </button>
                ) : null}
                {alert.kind === "scheduled_starting" ? (
                  <button
                    type="button"
                    disabled={joiningCallId === alert.call.id}
                    onClick={() => void joinScheduledCall(alert)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60 ${style.button}`}
                  >
                    {actionLabel}
                  </button>
                ) : (
                  <Link
                    href={href}
                    onClick={() => unlockVideoCallRingtone()}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${style.button}`}
                  >
                    {actionLabel}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
