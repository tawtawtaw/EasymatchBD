"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { ComplaintChatHistoryPanel } from "@/components/ComplaintChatHistoryPanel";
import { ComplaintReporterSummary } from "@/components/ComplaintReporterSummary";
import {
  getAdminComplaint,
  getAdminComplaintChatHistory,
  listAdminComplaintConsultants,
  reassignAdminComplaint,
  resolveAdminComplaint,
  type AdminConsultantOption,
} from "@/lib/admin-complaints";
import type { MemberComplaintDetail } from "@/lib/member-complaints";
import type { ComplaintChatHistory } from "@/lib/consultant-complaints";

function statusClass(status: string) {
  switch (status) {
    case "submitted":
      return "bg-amber-100 text-amber-900";
    case "assigned":
    case "in_progress":
      return "bg-blue-100 text-blue-900";
    case "resolved":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

export function AdminComplaintDetailPanel({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const t = useTranslations("admin.complaints");
  const ti = useTranslations("complaintInvestigation");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<MemberComplaintDetail | null>(null);
  const [chatHistory, setChatHistory] = useState<ComplaintChatHistory | null>(null);
  const [consultants, setConsultants] = useState<AdminConsultantOption[]>([]);
  const [selectedConsultant, setSelectedConsultant] = useState("");
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
      const [complaint, history, consultantList] = await Promise.all([
        getAdminComplaint(token, complaintId),
        getAdminComplaintChatHistory(token, complaintId),
        listAdminComplaintConsultants(token),
      ]);
      setDetail(complaint);
      setChatHistory(history);
      setConsultants(consultantList);
      setSelectedConsultant(complaint.assignedConsultantId ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [complaintId, router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleReassign() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(true);
    setError(null);
    try {
      await reassignAdminComplaint(
        token,
        complaintId,
        selectedConsultant || null,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
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
      await resolveAdminComplaint(
        token,
        complaintId,
        status,
        resolutionDraft.trim() || undefined,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{t("notFound")}</p>
      </main>
    );
  }

  const isClosed = ["resolved", "dismissed", "cancelled"].includes(detail.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/admin/complaints" className="text-sm font-medium text-zinc-600 hover:underline">
          {t("backList")}
        </Link>

        <header className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">
              {t("detailTitle", { code: detail.targetProfile?.profileCode ?? "—" })}
            </h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(detail.status)}`}>
              {t(`status.${detail.status}`)}
            </span>
          </div>
          <ComplaintReporterSummary
            namespace="admin.complaints"
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
          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-zinc-900">{t("reassignTitle")}</h2>
              <select
                value={selectedConsultant}
                onChange={(e) => setSelectedConsultant(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">{t("unassigned")}</option>
                {consultants.map((consultant) => (
                  <option key={consultant.id} value={consultant.id}>
                    {consultant.fullName ?? consultant.email ?? consultant.phone ?? consultant.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleReassign()}
                disabled={acting}
                className="mt-3 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {t("saveAssignment")}
              </button>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
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
                  className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-60"
                >
                  {t("markDismissed")}
                </button>
              </div>
            </div>
          </section>
        ) : detail.resolutionNote ? (
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-800">{t("resolutionNote")}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{detail.resolutionNote}</p>
          </section>
        ) : null}

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">{ti("chatTitle")}</h2>
          <ComplaintChatHistoryPanel history={chatHistory} loading={false} error={null} />
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
