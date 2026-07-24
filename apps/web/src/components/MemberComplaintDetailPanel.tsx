"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { useRequireMember } from "@/hooks/use-require-member";
import {
  cancelMemberComplaint,
  getMemberComplaint,
  listComplaintMessages,
  sendComplaintMessage,
  type ComplaintMessage,
  type MemberComplaintDetail,
} from "@/lib/member-complaints";

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

export function MemberComplaintDetailPanel({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const t = useTranslations("complaints");
  const tCommon = useTranslations("common");
  const { ready, isMember } = useRequireMember();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<MemberComplaintDetail | null>(null);
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
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
      const [complaint, messageList] = await Promise.all([
        getMemberComplaint(token, complaintId),
        listComplaintMessages(token, complaintId),
      ]);
      setDetail(complaint);
      setMessages(messageList);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [complaintId, router, t]);

  useEffect(() => {
    if (!ready || !isMember) return;
    void load();
  }, [ready, isMember, load]);

  async function handleSendMessage() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !messageDraft.trim()) return;
    setActing(true);
    setError(null);
    try {
      const sent = await sendComplaintMessage(token, complaintId, messageDraft);
      setMessages((prev) => [...prev, sent]);
      setMessageDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(true);
    setError(null);
    try {
      await cancelMemberComplaint(token, complaintId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setActing(false);
    }
  }

  if (!ready || !isMember || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{tCommon("loading")}</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{t("notFound")}</p>
        <Link href="/complaints" className="mt-4 inline-block text-sm text-rose-700 hover:underline">
          {t("backToList")}
        </Link>
      </main>
    );
  }

  const isClosed = ["resolved", "dismissed", "cancelled"].includes(detail.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/complaints" className="text-sm font-medium text-rose-700 hover:underline">
          {t("backToList")}
        </Link>

        <header className="mt-4 space-y-3">
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
          <p className="text-sm text-zinc-600">
            {t(`categories.${detail.category}`)} ·{" "}
            {new Date(detail.createdAt).toLocaleString()}
          </p>
          {detail.assignedConsultantName ? (
            <p className="text-sm text-zinc-600">
              {t("assignedConsultant", { name: detail.assignedConsultantName })}
            </p>
          ) : null}
        </header>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-800">{t("yourDescription")}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {detail.description}
          </p>
          {detail.resolutionNote ? (
            <div className="mt-4 border-t border-zinc-100 pt-4">
              <h3 className="text-sm font-semibold text-zinc-800">{t("resolutionNote")}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {detail.resolutionNote}
              </p>
            </div>
          ) : null}
        </section>

        {detail.status === "submitted" ? (
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={acting}
            className="mt-4 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {t("cancelComplaint")}
          </button>
        ) : null}

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">{t("messagesTitle")}</h2>
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("noMessages")}</p>
          ) : (
            <ul className="space-y-3">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={`rounded-xl border p-3 text-sm ${
                    message.senderIsConsultant
                      ? "border-violet-200 bg-violet-50"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <p className="text-xs font-semibold text-zinc-500">
                    {message.senderName ?? t("you")} ·{" "}
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-800">{message.body}</p>
                </li>
              ))}
            </ul>
          )}

          {!isClosed ? (
            <div className="flex gap-2">
              <textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                rows={3}
                placeholder={t("messagePlaceholder")}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={acting || !messageDraft.trim()}
                className="self-end rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
              >
                {t("sendMessage")}
              </button>
            </div>
          ) : null}
        </section>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}
