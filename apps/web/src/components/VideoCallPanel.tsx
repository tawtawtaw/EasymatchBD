"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { membershipFromSession } from "@/lib/membership";
import { PaidMembershipRequired } from "@/components/PaidMembershipRequired";
import { MIN_VIDEO_CALL_PRIVACY_LEVEL } from "@easymatch/shared";
import {
  canJoinScheduledCall,
  cancelVideoCall,
  createVideoCall,
  listConnectionVideoCalls,
  rescheduleVideoCall,
  startScheduledVideoCall,
  type VideoCallItem,
} from "@/lib/video-calls";
import { unlockVideoCallRingtone } from "@/lib/video-call-ringtone";
import {
  linkConsultantVideoCall,
} from "@/lib/consultant-case-workflow";
import {
  listConnectionConsultantEngagements,
  type ConsultantEngagementItem,
} from "@/lib/consultant-engagements";

function formatWhen(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type VideoCallPanelProps = {
  connectionId: string;
  privacyLevel: number;
  memberName: string;
};

export function VideoCallPanel({
  connectionId,
  privacyLevel,
  memberName,
}: VideoCallPanelProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("videoCalls");
  const { user: session, ready: sessionReady } = useAuthSession();
  const isPaid = membershipFromSession(session);
  const [calls, setCalls] = useState<VideoCallItem[]>([]);
  const [consultantCases, setConsultantCases] = useState<ConsultantEngagementItem[]>([]);
  const [linkCaseByCall, setLinkCaseByCall] = useState<Record<string, string>>({});
  const [scheduleAt, setScheduleAt] = useState("");
  const [rescheduleCallId, setRescheduleCallId] = useState<string | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoEnabled = privacyLevel >= MIN_VIDEO_CALL_PRIVACY_LEVEL;
  const refreshInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !videoEnabled || refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    try {
      const [list, engagements] = await Promise.all([
        listConnectionVideoCalls(token, connectionId, { activeOnly: true }),
        listConnectionConsultantEngagements(token, connectionId),
      ]);
      setCalls(list);
      setConsultantCases(
        engagements.filter(
          (item) =>
            item.assignedConsultantId &&
            (item.status === "assigned" || item.status === "in_progress"),
        ),
      );
    } catch {
      /* ignore background refresh errors */
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [connectionId, videoEnabled]);

  useEffect(() => {
    void refresh();
    const hasRinging = calls.some((call) => call.status === "ringing");
    const intervalMs = hasRinging ? 2_000 : 8_000;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [refresh, calls]);

  async function handleIncludeConsultant(callId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const caseId = linkCaseByCall[callId];
    if (!token || !caseId) return;
    setLoading(true);
    setError(null);
    try {
      await linkConsultantVideoCall(token, caseId, callId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCallNow() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      unlockVideoCallRingtone();
      const call = await createVideoCall(token, connectionId);
      router.push(
        `/messages/${connectionId}/call?callId=${encodeURIComponent(call.id)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSchedule(event: FormEvent) {
    event.preventDefault();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !scheduleAt) return;
    setLoading(true);
    setError(null);
    try {
      const iso = new Date(scheduleAt).toISOString();
      await createVideoCall(token, connectionId, iso);
      setScheduleAt("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinScheduled(call: VideoCallItem) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      let activeCall = call;
      if (
        call.scheduledAt &&
        (call.status === "scheduled" || call.status === "ringing")
      ) {
        activeCall = await startScheduledVideoCall(token, call.id);
      }
      router.push(
        `/messages/${connectionId}/call?callId=${encodeURIComponent(activeCall.id)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(callId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await cancelVideoCall(token, callId);
      if (rescheduleCallId === callId) {
        setRescheduleCallId(null);
        setRescheduleAt("");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }

  function openReschedule(call: VideoCallItem) {
    setRescheduleCallId(call.id);
    setRescheduleAt(
      call.scheduledAt
        ? toDatetimeLocalValue(call.scheduledAt)
        : toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
    );
    setError(null);
  }

  async function handleReschedule(event: FormEvent, callId: string) {
    event.preventDefault();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !rescheduleAt) return;
    setLoading(true);
    setError(null);
    try {
      await rescheduleVideoCall(token, callId, new Date(rescheduleAt).toISOString());
      setRescheduleCallId(null);
      setRescheduleAt("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }

  const minScheduleLocal = toDatetimeLocalValue(
    new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  );

  if (!videoEnabled) {
    return (
      <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-semibold text-amber-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-amber-800">
          {t("levelRequired", { level: MIN_VIDEO_CALL_PRIVACY_LEVEL })}
        </p>
      </section>
    );
  }

  if (sessionReady && !isPaid) {
    return (
      <section className="mb-4">
        <PaidMembershipRequired feature="videoCalls" compact />
      </section>
    );
  }

  const upcoming = calls.filter(
    (call) =>
      call.status === "scheduled" ||
      call.status === "ringing" ||
      call.status === "active",
  );

  const incomingRinging = upcoming.find(
    (call) => call.status === "ringing" && !call.isInitiator,
  );

  return (
    <section className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">{t("title")}</h2>
      <p className="mt-1 text-xs text-zinc-500">{t("subtitle", { name: memberName })}</p>

      {incomingRinging ? (
        <div
          className="mt-3 rounded-xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-md ring-2 ring-emerald-400/40"
          role="alert"
        >
          <p className="text-base font-bold text-emerald-950">
            {t("incomingCall")}
          </p>
          <p className="mt-1 text-sm text-emerald-900">{t("instantRingingHint")}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              unlockVideoCallRingtone();
              router.push(
                `/messages/${connectionId}/call?callId=${encodeURIComponent(incomingRinging.id)}&autoJoin=1`,
              );
            }}
            className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60 sm:w-auto"
          >
            {t("answer")}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleCallNow()}
          className="rounded-lg bg-rose-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
        >
          {t("callNow")}
        </button>
      </div>

      <form
        onSubmit={(event) => void handleSchedule(event)}
        className="mt-4 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4"
      >
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          {t("scheduleLabel")}
          <input
            type="datetime-local"
            value={scheduleAt}
            min={minScheduleLocal}
            onChange={(event) => setScheduleAt(event.target.value)}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !scheduleAt}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
        >
          {t("scheduleCall")}
        </button>
      </form>

      {upcoming.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
          {upcoming.map((call) => (
            <li
              key={call.id}
              className="rounded-lg bg-zinc-50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-zinc-800">
                    {t(`status.${call.status}`)}
                  </span>
                  {call.scheduledAt ? (
                    <span className="ml-2 text-zinc-500">
                      {formatWhen(call.scheduledAt, locale)}
                    </span>
                  ) : null}
                  {call.status === "scheduled" && call.isInitiator ? (
                    <span className="ml-2 text-xs text-zinc-400">
                      ({t("youScheduled")})
                    </span>
                  ) : null}
                  {call.status === "scheduled" && !call.isInitiator ? (
                    <span className="ml-2 text-xs text-zinc-400">
                      ({t("partnerScheduled")})
                    </span>
                  ) : null}
                  {call.consultantEngagementId ? (
                    <span className="ml-2 text-xs font-medium text-violet-800">
                      ({t("consultantIncluded")})
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {call.status === "scheduled" &&
                  call.scheduledAt &&
                  canJoinScheduledCall(call.scheduledAt) ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void handleJoinScheduled(call)}
                      className="rounded-lg bg-rose-800 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                    >
                      {t("joinScheduled")}
                    </button>
                  ) : null}
                  {call.status === "ringing" || call.status === "active" ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        router.push(
                          `/messages/${connectionId}/call?callId=${encodeURIComponent(call.id)}${call.status === "ringing" && !call.isInitiator ? "&autoJoin=1" : ""}`,
                        )
                      }
                      className="rounded-lg bg-rose-800 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                    >
                      {call.status === "ringing" && !call.isInitiator
                        ? t("answer")
                        : call.status === "ringing"
                          ? t("openCall")
                          : t("rejoin")}
                    </button>
                  ) : null}
                  {call.status === "scheduled" ? (
                    <>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => openReschedule(call)}
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-white disabled:opacity-60"
                      >
                        {t("reschedule")}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleCancel(call.id)}
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-white disabled:opacity-60"
                      >
                        {t("cancel")}
                      </button>
                    </>
                  ) : null}
                  {call.status === "ringing" && call.isInitiator ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void handleCancel(call.id)}
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-white disabled:opacity-60"
                    >
                      {t("cancel")}
                    </button>
                  ) : null}
                </div>
              </div>
              {!call.consultantEngagementId &&
              consultantCases.length > 0 &&
              (call.status === "scheduled" ||
                call.status === "ringing" ||
                call.status === "active") ? (
                <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-zinc-200 pt-2">
                  <label className="text-xs text-zinc-600">
                    {t("includeConsultantCase")}
                    <select
                      value={linkCaseByCall[call.id] ?? consultantCases[0]?.id ?? ""}
                      onChange={(event) =>
                        setLinkCaseByCall((prev) => ({
                          ...prev,
                          [call.id]: event.target.value,
                        }))
                      }
                      className="ml-2 rounded border border-zinc-300 px-2 py-1 text-xs"
                    >
                      {consultantCases.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.serviceLabelEn}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleIncludeConsultant(call.id)}
                    className="rounded-lg border border-violet-300 px-2 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-60"
                  >
                    {t("includeConsultant")}
                  </button>
                </div>
              ) : null}
              {rescheduleCallId === call.id ? (
                <form
                  onSubmit={(event) => void handleReschedule(event, call.id)}
                  className="mt-3 flex flex-wrap items-end gap-2 border-t border-zinc-200 pt-3"
                >
                  <label className="flex flex-col gap-1 text-xs text-zinc-600">
                    {t("rescheduleLabel")}
                    <input
                      type="datetime-local"
                      value={rescheduleAt}
                      min={minScheduleLocal}
                      onChange={(event) => setRescheduleAt(event.target.value)}
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={loading || !rescheduleAt}
                    className="rounded-lg bg-rose-800 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                  >
                    {t("saveReschedule")}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setRescheduleCallId(null);
                      setRescheduleAt("");
                    }}
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-white disabled:opacity-60"
                  >
                    {t("closeReschedule")}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
