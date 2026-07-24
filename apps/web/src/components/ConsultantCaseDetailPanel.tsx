"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  cancelConsultantMeeting,
  createConsultantDiaryEntry,
  deleteConsultantDiaryEntry,
  getConsultantCaseDetail,
  getConsultantVideoLiveKitToken,
  listConsultantCaseMessages,
  listConsultantDiary,
  listConsultantMeetings,
  scheduleConsultantMeeting,
  sendConsultantCaseMessage,
  updateConsultantDiaryEntry,
  type ConsultantCaseDetail,
  type ConsultantCaseMessage,
  type ConsultantDiaryEntry,
  type ConsultantMeeting,
} from "@/lib/consultant-case-workflow";

type Tab = "messages" | "meetings" | "diary";

export function ConsultantCaseDetailPanel({
  caseId,
  backHref,
  backLabel,
}: {
  caseId: string;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("consultantCase");
  const tc = useTranslations("consultant");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ConsultantCaseDetail | null>(null);
  const [tab, setTab] = useState<Tab>("messages");
  const [messages, setMessages] = useState<ConsultantCaseMessage[]>([]);
  const [meetings, setMeetings] = useState<ConsultantMeeting[]>([]);
  const [diary, setDiary] = useState<ConsultantDiaryEntry[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageRecipient, setMessageRecipient] = useState<string>("both");
  const [diaryDraft, setDiaryDraft] = useState("");
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [meetingAt, setMeetingAt] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [includeVideo, setIncludeVideo] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [caseDetail, messageList, meetingList] = await Promise.all([
        getConsultantCaseDetail(token, caseId),
        listConsultantCaseMessages(token, caseId),
        listConsultantMeetings(token, caseId),
      ]);
      setDetail(caseDetail);
      setMessages(messageList);
      setMeetings(meetingList);

      if (caseDetail.viewerIsConsultant) {
        const diaryList = await listConsultantDiary(token, caseId);
        setDiary(diaryList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [caseId, router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSendMessage() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !messageDraft.trim()) return;
    setActing(true);
    setError(null);
    try {
      const sent = await sendConsultantCaseMessage(token, caseId, messageDraft, {
        recipientId: messageRecipient === "both" ? null : messageRecipient,
      });
      setMessages((prev) => [...prev, sent]);
      setMessageDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setActing(false);
    }
  }

  async function handleSaveDiary() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !diaryDraft.trim()) return;
    setActing(true);
    setError(null);
    try {
      if (editingDiaryId) {
        const updated = await updateConsultantDiaryEntry(
          token,
          caseId,
          editingDiaryId,
          diaryDraft,
        );
        setDiary((prev) =>
          prev.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        setEditingDiaryId(null);
      } else {
        const created = await createConsultantDiaryEntry(
          token,
          caseId,
          diaryDraft,
        );
        setDiary((prev) => [created, ...prev]);
      }
      setDiaryDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setActing(false);
    }
  }

  async function handleDeleteDiary(entryId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(true);
    try {
      await deleteConsultantDiaryEntry(token, caseId, entryId);
      setDiary((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setActing(false);
    }
  }

  async function handleScheduleMeeting() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !meetingAt) return;
    setActing(true);
    setError(null);
    try {
      const created = await scheduleConsultantMeeting(token, caseId, {
        scheduledAt: new Date(meetingAt).toISOString(),
        agenda: meetingAgenda.trim() || undefined,
        includeVideoCall: includeVideo,
      });
      setMeetings((prev) => [created, ...prev]);
      setMeetingAt("");
      setMeetingAgenda("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setActing(false);
    }
  }

  async function handleCancelMeeting(meetingId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(true);
    try {
      await cancelConsultantMeeting(token, caseId, meetingId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setActing(false);
    }
  }

  async function handleJoinVideo(callId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(true);
    setError(null);
    try {
      const session = await getConsultantVideoLiveKitToken(token, callId);
      window.open(
        `/consultant/video/${callId}?url=${encodeURIComponent(session.url)}&token=${encodeURIComponent(session.token)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setActing(false);
    }
  }

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return <p className="text-zinc-600">{tCommon("loading")}</p>;
  }

  if (!detail) {
    return <p className="text-zinc-600">{t("notFound")}</p>;
  }

  const isConsultant = detail.viewerIsConsultant;
  const members = [
    detail.connection.memberLow,
    detail.connection.memberHigh,
  ]
    .map((m) => m.profileCode ?? m.fullName ?? "—")
    .join(" · ");

  function memberLabel(member: {
    userId: string;
    fullName: string | null;
    profileCode: string | null;
  }) {
    return member.fullName ?? member.profileCode ?? t("memberFallback");
  }

  function audienceLabel(msg: ConsultantCaseMessage) {
    if (msg.audience === "both") {
      return t("audienceBoth");
    }
    if (msg.recipient?.id && detail && !isConsultant) {
      return t("audiencePrivateToYou");
    }
    return t("audiencePrivateTo", {
      name: msg.recipient?.displayName ?? t("memberFallback"),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref ?? (isConsultant ? "/consultant/home" : "/connections")}
          className="text-sm font-medium text-violet-900 hover:underline"
        >
          ← {backLabel ?? (isConsultant ? t("backToCases") : t("backToConnections"))}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">
          {tc(`services.${detail.serviceType}` as "services.profile_assessment")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">{members}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {tc(`status.${detail.status}` as "status.queued")} · ৳{detail.amountBdt}
        </p>
        {detail.memberNotes ? (
          <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            {detail.memberNotes}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {(["messages", "meetings", ...(isConsultant ? (["diary"] as Tab[]) : [])] as Tab[]).map(
          (key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                tab === key
                  ? "bg-violet-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {t(`tabs.${key}`)}
            </button>
          ),
        )}
      </div>

      {tab === "messages" ? (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("noMessages")}</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.isMine
                      ? "ml-8 bg-violet-50 text-violet-950"
                      : "mr-8 bg-zinc-50 text-zinc-800"
                  }`}
                >
                  <p className="text-xs font-semibold text-zinc-500">
                    {msg.sender.displayName}
                    <span className="ml-2 font-normal text-violet-700">
                      · {audienceLabel(msg)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    {formatDateTime(msg.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2">
            {isConsultant ? (
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                {t("sendTo")}
                <select
                  value={messageRecipient}
                  onChange={(e) => setMessageRecipient(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                >
                  <option value="both">{t("sendToBoth")}</option>
                  <option value={detail.connection.memberLow.userId}>
                    {t("sendToMember", {
                      name: memberLabel(detail.connection.memberLow),
                    })}
                  </option>
                  <option value={detail.connection.memberHigh.userId}>
                    {t("sendToMember", {
                      name: memberLabel(detail.connection.memberHigh),
                    })}
                  </option>
                </select>
              </label>
            ) : null}
            <div className="flex gap-2">
              <textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                rows={2}
                placeholder={t("messagePlaceholder")}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={acting || !messageDraft.trim()}
                onClick={() => void handleSendMessage()}
                className="self-end rounded-lg bg-violet-900 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
              >
                {t("sendMessage")}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "meetings" ? (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
          {isConsultant && detail.assignedConsultantId ? (
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-900">
                {t("scheduleMeeting")}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-zinc-600">
                  {t("meetingDateTime")}
                  <input
                    type="datetime-local"
                    value={meetingAt}
                    onChange={(e) => setMeetingAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-zinc-600 sm:col-span-2">
                  {t("meetingAgenda")}
                  <input
                    type="text"
                    value={meetingAgenda}
                    onChange={(e) => setMeetingAgenda(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-zinc-700">
                <input
                  type="checkbox"
                  checked={includeVideo}
                  onChange={(e) => setIncludeVideo(e.target.checked)}
                />
                {t("includeVideoCall")}
              </label>
              <button
                type="button"
                disabled={acting || !meetingAt}
                onClick={() => void handleScheduleMeeting()}
                className="mt-3 rounded-lg bg-violet-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
              >
                {t("scheduleMeeting")}
              </button>
            </div>
          ) : null}

          {meetings.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("noMeetings")}</p>
          ) : (
            <ul className="space-y-3">
              {meetings.map((meeting) => (
                <li
                  key={meeting.id}
                  className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
                >
                  <p className="font-medium text-zinc-900">
                    {formatDateTime(meeting.scheduledAt)}
                  </p>
                  {meeting.agenda ? (
                    <p className="mt-1 text-sm text-zinc-600">{meeting.agenda}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-zinc-500">{meeting.status}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {meeting.videoCall &&
                    (meeting.videoCall.status === "scheduled" ||
                      meeting.videoCall.status === "active" ||
                      meeting.videoCall.status === "ringing") ? (
                      isConsultant ? (
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() =>
                            void handleJoinVideo(meeting.videoCall!.id)
                          }
                          className="rounded-lg bg-rose-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-900 disabled:opacity-50"
                        >
                          {t("joinVideo")}
                        </button>
                      ) : (
                        <Link
                          href={`/messages/${detail.connectionId}`}
                          className="rounded-lg bg-rose-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-900"
                        >
                          {t("openMessagesForVideo")}
                        </Link>
                      )
                    ) : null}
                    {isConsultant && meeting.status === "scheduled" ? (
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => void handleCancelMeeting(meeting.id)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-white disabled:opacity-50"
                      >
                        {t("cancelMeeting")}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "diary" && isConsultant ? (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-600">{t("diaryHint")}</p>
          <textarea
            value={diaryDraft}
            onChange={(e) => setDiaryDraft(e.target.value)}
            rows={4}
            placeholder={t("diaryPlaceholder")}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={acting || !diaryDraft.trim()}
              onClick={() => void handleSaveDiary()}
              className="rounded-lg bg-violet-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
            >
              {editingDiaryId ? t("updateDiary") : t("addDiaryEntry")}
            </button>
            {editingDiaryId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingDiaryId(null);
                  setDiaryDraft("");
                }}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800"
              >
                {tCommon("cancel")}
              </button>
            ) : null}
          </div>
          <ul className="space-y-3">
            {diary.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
              >
                <p className="whitespace-pre-wrap text-sm text-zinc-800">
                  {entry.body}
                </p>
                <p className="mt-2 text-[10px] text-zinc-400">
                  {formatDateTime(entry.updatedAt)}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDiaryId(entry.id);
                      setDiaryDraft(entry.body);
                    }}
                    className="text-xs font-medium text-violet-900 hover:underline"
                  >
                    {t("editDiary")}
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void handleDeleteDiary(entry.id)}
                    className="text-xs font-medium text-red-700 hover:underline"
                  >
                    {t("deleteDiary")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
