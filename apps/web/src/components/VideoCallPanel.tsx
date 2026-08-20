"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { membershipFromSession } from "@/lib/membership";
import { PaidMembershipRequired } from "@/components/PaidMembershipRequired";
import {
  isClosedVideoCallStatus,
  MIN_VIDEO_CALL_PRIVACY_LEVEL,
  videoCallOccurredAt,
} from "@easymatch/shared";
import {
  canJoinScheduledCall,
  cancelVideoCall,
  createVideoCall,
  listConnectionVideoCalls,
  rescheduleVideoCall,
  startScheduledVideoCall,
  type VideoCallItem,
} from "@/lib/video-calls";
import { CallLogRow } from "@/components/CallLogRow";
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
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toDateInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${toDateInputValue(date)}T${toTimeInputValue(date)}`;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="3" y="6.5" width="12.5" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15.5 10.5 21 8v8l-5.5-2.5v-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
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
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [rescheduleCallId, setRescheduleCallId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
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
        listConnectionVideoCalls(token, connectionId),
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
    if (!token || !scheduleDate || !scheduleTime) return;
    setLoading(true);
    setError(null);
    try {
      const iso = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      await createVideoCall(token, connectionId, iso);
      setScheduleDate("");
      setScheduleTime("");
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
        setRescheduleDate("");
        setRescheduleTime("");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }

  function openReschedule(call: VideoCallItem) {
    const local = call.scheduledAt
      ? toDatetimeLocalValue(call.scheduledAt)
      : toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000).toISOString());
    const [datePart = "", timePart = ""] = local.split("T");
    setRescheduleCallId(call.id);
    setRescheduleDate(datePart);
    setRescheduleTime(timePart);
    setError(null);
  }

  async function handleReschedule(event: FormEvent, callId: string) {
    event.preventDefault();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !rescheduleDate || !rescheduleTime) return;
    setLoading(true);
    setError(null);
    try {
      await rescheduleVideoCall(
        token,
        callId,
        new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString(),
      );
      setRescheduleCallId(null);
      setRescheduleDate("");
      setRescheduleTime("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }

  const minDateLocal = toDateInputValue(new Date());
  const minTimeLocal = toTimeInputValue(new Date(Date.now() + 5 * 60 * 1000));
  const scheduleReady = Boolean(scheduleDate && scheduleTime);
  const schedulePreview =
    scheduleReady && !Number.isNaN(new Date(`${scheduleDate}T${scheduleTime}`).getTime())
      ? formatWhen(new Date(`${scheduleDate}T${scheduleTime}`).toISOString(), locale)
      : "";

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

  const history = calls
    .filter((call) => isClosedVideoCallStatus(call.status))
    .sort(
      (a, b) =>
        new Date(videoCallOccurredAt(b)).getTime() -
        new Date(videoCallOccurredAt(a)).getTime(),
    )
    .slice(0, 20);

  const incomingRinging = upcoming.find(
    (call) => call.status === "ringing" && !call.isInitiator,
  );

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-rose-50 bg-gradient-to-r from-rose-50 to-white px-4 py-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-800 shadow-sm ring-1 ring-rose-100">
          <VideoIcon />
        </span>
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{t("title")}</h2>
          <p className="mt-0.5 text-xs leading-5 text-zinc-500">
            {t("subtitle", { name: memberName })}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
      {incomingRinging ? (
        <div
          className="rounded-xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-md ring-2 ring-emerald-400/40"
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
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={loading}
        onClick={() => void handleCallNow()}
        className="flex w-full items-center gap-3 rounded-xl bg-rose-800 px-4 py-3 text-left text-white hover:bg-rose-900 disabled:opacity-60"
      >
        <VideoIcon />
        <span>
          <span className="block text-sm font-semibold">{t("callNow")}</span>
          <span className="block text-xs font-medium text-rose-100">
            {t("callNowHint")}
          </span>
        </span>
      </button>

      <form
        onSubmit={(event) => void handleSchedule(event)}
        className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4"
      >
        <p className="text-sm font-semibold text-sky-950">{t("scheduleTitle")}</p>
        <p className="mt-1 text-xs leading-5 text-sky-800">{t("scheduleHint")}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-700 text-[11px] font-bold text-white">
                1
              </span>
              <CalendarIcon />
              {t("scheduleDate")}
            </span>
            <input
              type="date"
              value={scheduleDate}
              min={minDateLocal}
              onChange={(event) => setScheduleDate(event.target.value)}
              className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-700 text-[11px] font-bold text-white">
                2
              </span>
              <ClockIcon />
              {t("scheduleTime")}
            </span>
            <input
              type="time"
              value={scheduleTime}
              min={scheduleDate === minDateLocal ? minTimeLocal : undefined}
              onChange={(event) => setScheduleTime(event.target.value)}
              className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>
        </div>

        <p className={`mt-3 text-xs ${schedulePreview ? "font-semibold text-sky-950" : "text-sky-700"}`}>
          {schedulePreview
            ? t("schedulePreview", { when: schedulePreview })
            : t("scheduleNeedDateTime")}
        </p>

        <button
          type="submit"
          disabled={loading || !scheduleReady}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60 sm:w-auto"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
            3
          </span>
          {t("scheduleCall")}
        </button>
      </form>

      {upcoming.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("upcomingTitle")}
          </h3>
          <ul className="mt-2 space-y-2">
          {upcoming.map((call) => (
            <li
              key={call.id}
              className="rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      call.status === "ringing" || call.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {t(`status.${call.status}`)}
                  </span>
                  {call.scheduledAt ? (
                    <p className="mt-1.5 font-semibold text-zinc-900">
                      {formatWhen(call.scheduledAt, locale)}
                    </p>
                  ) : null}
                  {call.status === "scheduled" && call.isInitiator ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {t("youScheduled")}
                    </p>
                  ) : null}
                  {call.status === "scheduled" && !call.isInitiator ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {t("partnerScheduled")}
                    </p>
                  ) : null}
                  {call.consultantEngagementId ? (
                    <p className="mt-0.5 text-xs font-medium text-violet-800">
                      {t("consultantIncluded")}
                    </p>
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
                  className="mt-3 space-y-3 rounded-xl border border-sky-200 bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-sky-950">
                      {t("rescheduleLabel")}
                    </p>
                    <p className="mt-0.5 text-xs text-sky-800">{t("rescheduleHint")}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sky-800">
                        {t("scheduleDate")}
                      </span>
                      <input
                        type="date"
                        value={rescheduleDate}
                        min={minDateLocal}
                        onChange={(event) => setRescheduleDate(event.target.value)}
                        className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sky-800">
                        {t("scheduleTime")}
                      </span>
                      <input
                        type="time"
                        value={rescheduleTime}
                        min={
                          rescheduleDate === minDateLocal ? minTimeLocal : undefined
                        }
                        onChange={(event) => setRescheduleTime(event.target.value)}
                        className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={loading || !rescheduleDate || !rescheduleTime}
                      className="rounded-lg bg-rose-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                    >
                      {t("saveReschedule")}
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setRescheduleCallId(null);
                        setRescheduleDate("");
                        setRescheduleTime("");
                      }}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      {t("closeReschedule")}
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
          </ul>
        </div>
      ) : null}
      {history.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("log.title")}
          </h3>
          <ul className="mt-1 divide-y divide-zinc-100">
            {history.map((call) => (
              <li key={call.id}>
                <CallLogRow
                  call={call}
                  canCallBack
                  calling={loading}
                  onCallAgain={() => void handleCallNow()}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      </div>
    </section>
  );
}
