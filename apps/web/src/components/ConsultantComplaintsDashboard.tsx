"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getProfileEditorBootstrap } from "@/lib/api";
import { useMounted } from "@/hooks/use-mounted";
import {
  assignConsultantComplaint,
  listConsultantComplaints,
  updateConsultantComplaintStatus,
} from "@/lib/consultant-complaints";
import type { MemberComplaintItem } from "@/lib/member-complaints";
import { ComplaintReporterSummary } from "@/components/ComplaintReporterSummary";
import { isMarriageConsultantRole } from "@/lib/consultant";
import { resolveStaffDisplayName } from "@/lib/staff-display";

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

export function ConsultantComplaintsDashboard() {
  const router = useRouter();
  const t = useTranslations("consultantComplaints");
  const tc = useTranslations("consultantHome");
  const tCommon = useTranslations("common");
  const mounted = useMounted();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<MemberComplaintItem[]>([]);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }
    try {
      const bootstrap = await getProfileEditorBootstrap(token);
      if (!isMarriageConsultantRole(bootstrap.role)) {
        router.replace("/auth");
        return;
      }
      setDisplayName(resolveStaffDisplayName(bootstrap.profile));
      const rows = await listConsultantComplaints(token);
      setComplaints(rows);
    } catch {
      router.replace("/auth");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  async function handleAssign(complaintId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(complaintId);
    setError(null);
    try {
      await assignConsultantComplaint(token, complaintId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("actionError"));
    } finally {
      setActing(null);
    }
  }

  async function handleStartWork(complaintId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(`${complaintId}-progress`);
    setError(null);
    try {
      await updateConsultantComplaintStatus(token, complaintId, "in_progress");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("actionError"));
    } finally {
      setActing(null);
    }
  }

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{tCommon("loading")}</p>
      </main>
    );
  }

  const name = displayName?.trim() || tc("fallbackName");

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="space-y-3">
          <span className="inline-flex rounded-full bg-violet-900 px-3 py-1 text-xs font-semibold text-white">
            {tc("roleBadge")}
          </span>
          <h1 className="text-3xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="text-zinc-600">{t("subtitle", { name })}</p>
          <nav className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/consultant/home"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {t("navCases")}
            </Link>
            <span className="rounded-full bg-violet-900 px-4 py-2 text-sm font-semibold text-white">
              {t("navComplaints")}
            </span>
          </nav>
        </header>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <section className="mt-8 space-y-4">
          <p className="text-sm text-zinc-600">{t("queueHint")}</p>
          {complaints.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
              {t("emptyQueue")}
            </p>
          ) : (
            <ul className="space-y-4">
              {complaints.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {t("againstProfile", {
                          code: item.targetProfile?.profileCode ?? "—",
                        })}
                      </p>
                      <ComplaintReporterSummary
                        namespace="consultantComplaints"
                        reporter={item.reporter}
                      />
                      <p className="mt-1 text-sm text-zinc-500">
                        {t(`categories.${item.category}`)} ·{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(item.status)}`}
                    >
                      {t(`status.${item.status}`)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-zinc-700">{item.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.status === "submitted" ? (
                      <button
                        type="button"
                        onClick={() => void handleAssign(item.id)}
                        disabled={acting === item.id}
                        className="rounded-full bg-violet-900 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-950 disabled:opacity-60"
                      >
                        {t("takeComplaint")}
                      </button>
                    ) : null}
                    {item.status === "assigned" ? (
                      <button
                        type="button"
                        onClick={() => void handleStartWork(item.id)}
                        disabled={acting === `${item.id}-progress`}
                        className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                      >
                        {t("startWork")}
                      </button>
                    ) : null}
                    <Link
                      href={`/consultant/complaints/${item.id}`}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                    >
                      {t("openComplaint")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
