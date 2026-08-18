"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  acceptVideoCall,
  declineVideoCall,
  startScheduledVideoCall,
} from "@/lib/video-calls";
import { useMemberAlerts } from "@/components/MemberAlertsProvider";
import {
  isVideoCallPath,
  useGlobalCallSession,
} from "@/components/GlobalCallSessionProvider";
import { useScheduledCallRingAlert } from "@/hooks/use-scheduled-call-ring";
import { unlockVideoCallRingtone } from "@/lib/video-call-ringtone";

export function IncomingCallOverlay() {
  const t = useTranslations("videoCalls");
  const router = useRouter();
  const pathname = usePathname();
  const { summary, refresh, dismissIncomingCall } = useMemberAlerts();
  const { isIncomingCallSuppressed, suppressIncomingCall, session, suppressedIncomingCallIds } =
    useGlobalCallSession();
  const [busy, setBusy] = useState(false);

  const incoming = useMemo(() => {
    if (isVideoCallPath(pathname)) return null;

    const fromList =
      summary.callAlerts?.find(
        (alert) =>
          alert.kind === "incoming" &&
          !isIncomingCallSuppressed(alert.call.id),
      ) ?? null;
    if (fromList) return fromList;

    const legacy = summary.incomingCallAlert;
    if (
      legacy?.kind === "incoming" &&
      !isIncomingCallSuppressed(legacy.call.id)
    ) {
      return legacy;
    }

    return null;
  }, [
    pathname,
    summary.callAlerts,
    summary.incomingCallAlert,
    isIncomingCallSuppressed,
  ]);

  const scheduledRing = useScheduledCallRingAlert(
    summary.callAlerts,
    suppressedIncomingCallIds,
  );
  const scheduled =
    !incoming && !isVideoCallPath(pathname) ? scheduledRing : null;

  const alert = incoming ?? scheduled;
  const isScheduledRing = Boolean(scheduled && !incoming);

  const answer = useCallback(async () => {
    if (!alert) return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setBusy(true);
    unlockVideoCallRingtone();
    try {
      if (isScheduledRing) {
        await startScheduledVideoCall(token, alert.call.id);
      } else {
        await acceptVideoCall(token, alert.call.id);
        dismissIncomingCall(alert.call.id);
      }
      suppressIncomingCall(alert.call.id);
      await refresh({ forceFresh: true });
      router.push(
        `/messages/${alert.call.connectionId}/call?callId=${encodeURIComponent(alert.call.id)}${isScheduledRing ? "" : "&autoJoin=1"}`,
      );
    } catch {
      router.push(
        `/messages/${alert.call.connectionId}/call?callId=${encodeURIComponent(alert.call.id)}${isScheduledRing ? "" : "&autoJoin=1"}`,
      );
    } finally {
      setBusy(false);
    }
  }, [
    alert,
    dismissIncomingCall,
    isScheduledRing,
    refresh,
    router,
    suppressIncomingCall,
  ]);

  const decline = useCallback(async () => {
    if (!alert) return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setBusy(true);
    try {
      if (isScheduledRing) {
        suppressIncomingCall(alert.call.id);
      } else {
        await declineVideoCall(token, alert.call.id);
        suppressIncomingCall(alert.call.id);
        dismissIncomingCall(alert.call.id);
        await refresh({ forceFresh: true });
      }
    } finally {
      setBusy(false);
    }
  }, [
    alert,
    dismissIncomingCall,
    isScheduledRing,
    refresh,
    suppressIncomingCall,
  ]);

  if (!alert) {
    return null;
  }

  if (
    session?.callId === alert.call.id &&
    (session.phase === "connecting" ||
      session.phase === "active" ||
      session.joining)
  ) {
    return null;
  }

  const partner =
    alert.partnerName?.trim() || t("unknownMember");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/92 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
    >
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-emerald-400/40 bg-gradient-to-b from-emerald-950 to-zinc-950 p-8 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
          {t("title")}
        </p>
        <h2 id="incoming-call-title" className="text-2xl font-bold text-white">
          {isScheduledRing
            ? t("scheduledOverlayTitle", { partner })
            : t("incomingOverlayTitle", { partner })}
        </h2>
        <p className="text-sm text-emerald-100/90">
          {isScheduledRing ? t("scheduledOverlayHint") : t("incomingOverlayHint")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => void answer()}
            className="min-h-12 flex-1 rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {busy
              ? t("joiningCall")
              : isScheduledRing
                ? t("joinScheduled")
                : t("accept")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void decline()}
            className="min-h-12 flex-1 rounded-full bg-red-700 px-6 py-3 text-base font-bold text-white hover:bg-red-600 disabled:opacity-60"
          >
            {isScheduledRing ? t("silenceRing") : t("decline")}
          </button>
        </div>
        <Link
          href={`/messages/${alert.call.connectionId}/call?callId=${encodeURIComponent(alert.call.id)}${isScheduledRing ? "" : "&autoJoin=1"}`}
          onClick={() => {
            unlockVideoCallRingtone();
            suppressIncomingCall(alert.call.id);
          }}
          className="inline-block text-sm font-medium text-emerald-200 underline-offset-2 hover:underline"
        >
          {t("openCall")}
        </Link>
      </div>
    </div>
  );
}
