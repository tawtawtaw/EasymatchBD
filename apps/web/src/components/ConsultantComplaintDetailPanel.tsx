"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import type {
  ComplaintDiaryEntry,
  ComplaintMessage,
  MemberComplaintDetail,
} from "@/lib/member-complaints";
import {
  createConsultantComplaintDiaryEntry,
  deleteConsultantComplaintDiaryEntry,
  getConsultantComplaint,
  getConsultantComplaintChatHistory,
  listConsultantComplaintDiary,
  listConsultantComplaintMessages,
  resolveConsultantComplaint,
  sendConsultantComplaintMessage,
  updateConsultantComplaintDiaryEntry,
  type ComplaintChatHistory,
} from "@/lib/consultant-complaints";
import { ComplaintChatHistoryPanel } from "@/components/ComplaintChatHistoryPanel";
import { ComplaintReporterSummary } from "@/components/ComplaintReporterSummary";

type Tab = "messages" | "diary" | "chat";

function statusClass(status: string) {
  switch (status) {
    case "submitted":
      return "bg-amber-100 text-amber-900";
    case "assigned":
    case "in_progress":
      return "bg-blue-100 text-blue-900";
    case "resolved":
      return "bg-emerald-100 text-emerald-800";
    case "dismissed":
    case "cancelled":
      return "bg-zinc-200 text-zinc-700";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

export function ConsultantComplaintDetailPanel({
  complaintId,
}: {
  complaintId: string;
}) {
  const router = useRouter();
  const t = useTranslations("consultantComplaints");
  const tc = useTranslations("consultantCase");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<MemberComplaintDetail | null>(null);
  const [tab, setTab] = useState<Tab>("messages");
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [diary, setDiary] = useState<ComplaintDiaryEntry[]>([]);
  const [chatHistory, setChatHistory] = useState<ComplaintChatHistory | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [messagePrivate, setMessagePrivate] = useState(false);
  const [diaryDraft, setDiaryDraft] = useState("");
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [resolutionDraft, setResolutionDraft] = useState("");
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
      const [complaint, messageList, diaryList] = await Promise.all([
        getConsultantComplaint(token, complaintId),
        listConsultantComplaintMessages(token, complaintId),
        listConsultantComplaintDiary(token, complaintId),
      ]);
      setDetail(complaint);
      setMessages(messageList);
      setDiary(diaryList);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [complaintId, router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== "chat") return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    let cancelled = false;
    setChatLoading(true);
    setChatError(null);
    void getConsultantComplaintChatHistory(token, complaintId)
      .then((history) => {
        if (!cancelled) setChatHistory(history);
      })
      .catch((err) => {
        if (!cancelled) {
          setChatError(err instanceof Error ? err.message : t("chatLoadError"));
        }
      })
      .finally(() => {
        if (!cancelled) setChatLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, complaintId, t]);

  async function handleSendMessage() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !messageDraft.trim()) return;
    setActing(true);
    setError(null);
    try {
      const sent = await sendConsultantComplaintMessage(
        token,
        complaintId,
        messageDraft,
        messagePrivate,
      );
      setMessages((prev) => [...prev, sent]);
      setMessageDraft("");
      setMessagePrivate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("actionError"));
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
        const updated = await updateConsultantComplaintDiaryEntry(
          token,
          complaintId,
          editingDiaryId,
          diaryDraft,
        );
        setDiary((prev) =>
          prev.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        setEditingDiaryId(null);
      } else {
        const created = await createConsultantComplaintDiaryEntry(
          token,
          complaintId,
          diaryDraft,
        );
        setDiary((prev) => [created, ...prev]);
      }
      setDiaryDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("actionError"));
    } finally {
      setActing(false);
    }
  }

  async function handleDeleteDiary(entryId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(true);
    try {
      await deleteConsultantComplaintDiaryEntry(token, complaintId, entryId);
      setDiary((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("actionError"));
    } finally {
      setActing(false);
    }
  }

  async function handleResolve(status: "resolved" | "dismissed") {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(true);
    setError(null);
    try {
      await resolveConsultantComplaint(
        token,
        complaintId,
        status,
        resolutionDraft.trim() || undefined,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("actionError"));
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{tCommon("loading")}</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{t("notFound")}</p>
        <Link
          href="/consultant/complaints"
          className="mt-4 inline-block text-sm text-violet-800 hover:underline"
        >
          {t("backToQueue")}
        </Link>
      </main>
    );
  }

  const isClosed = ["resolved", "dismissed", "cancelled"].includes(detail.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/consultant/complaints"
          className="text-sm font-medium text-violet-800 hover:underline"
        >
          {t("backToQueue")}
        </Link>

        <header className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">
              {t("detailTitle", {
                code: detail.targetProfile?.profileCode ?? "—",
              })}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(detail.status)}`}
            >
              {t(`status.${detail.status}`)}
            </span>
          </div>
          <ComplaintReporterSummary
            namespace="consultantComplaints"
            reporter={detail.reporter}
            className="text-sm text-zinc-600"
          />
          <p className="text-sm text-zinc-600">
            {t(`categories.${detail.category}`)}
          </p>
        </header>

        <section className="mt-4 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("reporterProfileId")}
            </p>
            <p className="mt-1 font-mono text-base font-semibold text-zinc-900">
              {detail.reporter?.profileCode ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("reportedProfileId")}
            </p>
            <p className="mt-1 font-mono text-base font-semibold text-zinc-900">
              {detail.targetProfile?.profileCode ?? "—"}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {detail.description}
          </p>
        </section>

        {!isClosed ? (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-900">{t("resolveTitle")}</h2>
            <textarea
              value={resolutionDraft}
              onChange={(e) => setResolutionDraft(e.target.value)}
              rows={3}
              placeholder={t("resolutionPlaceholder")}
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleResolve("resolved")}
                disabled={acting}
                className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {t("markResolved")}
              </button>
              <button
                type="button"
                onClick={() => void handleResolve("dismissed")}
                disabled={acting}
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                {t("markDismissed")}
              </button>
            </div>
          </section>
        ) : detail.resolutionNote ? (
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-800">{t("resolutionNote")}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
              {detail.resolutionNote}
            </p>
          </section>
        ) : null}

        <div className="mt-8 flex gap-2 border-b border-zinc-200">
          {(["messages", "chat", "diary"] as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`border-b-2 px-4 py-2 text-sm font-semibold ${
                tab === key
                  ? "border-violet-700 text-violet-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>

        {tab === "messages" ? (
          <section className="mt-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("noMessages")}</p>
            ) : (
              <ul className="space-y-3">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className={`rounded-xl border p-3 text-sm ${
                      message.isPrivate
                        ? "border-amber-200 bg-amber-50"
                        : message.senderIsConsultant
                          ? "border-violet-200 bg-violet-50"
                          : "border-zinc-200 bg-white"
                    }`}
                  >
                    <p className="text-xs font-semibold text-zinc-500">
                      {message.senderName ?? tc("memberFallback")} ·{" "}
                      {message.isPrivate ? t("privateNote") : t("publicMessage")} ·{" "}
                      {new Date(message.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-zinc-800">{message.body}</p>
                  </li>
                ))}
              </ul>
            )}
            {!isClosed ? (
              <div className="space-y-2">
                <textarea
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  rows={3}
                  placeholder={t("messagePlaceholder")}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={messagePrivate}
                    onChange={(e) => setMessagePrivate(e.target.checked)}
                  />
                  {t("privateNoteCheckbox")}
                </label>
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={acting || !messageDraft.trim()}
                  className="rounded-full bg-violet-900 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-950 disabled:opacity-60"
                >
                  {t("sendMessage")}
                </button>
              </div>
            ) : null}
          </section>
        ) : tab === "chat" ? (
          <section className="mt-4">
            <ComplaintChatHistoryPanel
              history={chatHistory}
              loading={chatLoading}
              error={chatError}
            />
          </section>
        ) : (
          <section className="mt-4 space-y-4">
            {!isClosed ? (
              <div className="space-y-2">
                <textarea
                  value={diaryDraft}
                  onChange={(e) => setDiaryDraft(e.target.value)}
                  rows={4}
                  placeholder={tc("diaryPlaceholder")}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveDiary()}
                    disabled={acting || !diaryDraft.trim()}
                    className="rounded-full bg-violet-900 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-950 disabled:opacity-60"
                  >
                    {editingDiaryId ? tc("updateDiary") : tc("addDiaryEntry")}
                  </button>
                  {editingDiaryId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDiaryId(null);
                        setDiaryDraft("");
                      }}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
                    >
                      {t("cancelForm")}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {diary.length === 0 ? (
              <p className="text-sm text-zinc-500">{tc("diaryHint")}</p>
            ) : (
              <ul className="space-y-3">
                {diary.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 text-sm"
                  >
                    <p className="text-xs text-zinc-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-zinc-800">{entry.body}</p>
                    {!isClosed ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDiaryId(entry.id);
                            setDiaryDraft(entry.body);
                          }}
                          className="text-xs font-semibold text-violet-800 hover:underline"
                        >
                          {tc("editDiary")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDiary(entry.id)}
                          className="text-xs font-semibold text-red-700 hover:underline"
                        >
                          {tc("deleteDiary")}
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}
