"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getProfileEditorBootstrap } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import {
  assignConsultantCase,
  listConsultantCases,
  updateConsultantCaseStatus,
  type ConsultantCaseItem,
} from "@/lib/consultant-engagements";
import { isMarriageConsultantRole } from "@/lib/consultant";
import { resolveStaffDisplayName } from "@/lib/staff-display";

function statusClass(status: string) {
  switch (status) {
    case "queued":
      return "bg-amber-100 text-amber-900";
    case "assigned":
    case "in_progress":
      return "bg-blue-100 text-blue-900";
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

export function ConsultantHomeDashboard() {
  const router = useRouter();
  const t = useTranslations("consultantHome");
  const tc = useTranslations("consultant");
  const tCommon = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<ConsultantCaseItem[]>([]);
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
      const caseList = await listConsultantCases(token);
      setCases(caseList);
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

  async function handleAssign(caseId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(caseId);
    setError(null);
    try {
      await assignConsultantCase(token, caseId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setActing(null);
    }
  }

  async function handleStatus(
    caseId: string,
    status: "in_progress" | "completed",
  ) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(`${caseId}-${status}`);
    setError(null);
    try {
      await updateConsultantCaseStatus(token, caseId, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
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

  const name = displayName?.trim() || t("fallbackName");

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="space-y-3">
          <span className="inline-flex rounded-full bg-violet-900 px-3 py-1 text-xs font-semibold text-white">
            {t("roleBadge")}
          </span>
          <h1 className="text-3xl font-bold text-zinc-900">
            {t("greeting", { name })}
          </h1>
          <p className="max-w-2xl text-zinc-600">{t("subtitle")}</p>
          <nav className="flex flex-wrap gap-3 pt-2">
            <span className="rounded-full bg-violet-900 px-4 py-2 text-sm font-semibold text-white">
              {t("navCases")}
            </span>
            <Link
              href="/consultant/complaints"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {t("navComplaints")}
            </Link>
          </nav>
        </header>

        {error ? (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <section className="mt-10">
          <h2 className="text-lg font-bold text-zinc-900">{t("casesTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("casesHint")}</p>

          {cases.length === 0 ? (
            <p className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              {t("emptyCases")}
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {cases.map((item) => {
                const members = [
                  item.connection.memberLow,
                  item.connection.memberHigh,
                ]
                  .map((m) => m.profileCode ?? m.fullName ?? "—")
                  .join(" · ");

                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-900">
                          {tc(`services.${item.serviceType}` as "services.profile_assessment")}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">{members}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {t("requestedBy", {
                            name:
                              item.requester.fullName ??
                              item.requester.profileCode ??
                              "—",
                          })}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {t("paidAmount", { amount: item.amountBdt })}
                        </p>
                        {item.memberNotes ? (
                          <p className="mt-2 text-xs text-zinc-700">
                            {t("memberNotes", { notes: item.memberNotes })}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(item.status)}`}
                      >
                        {tc(`status.${item.status}` as "status.queued")}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/consultant/cases/${item.id}`}
                        className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50"
                      >
                        {t("openCase")}
                      </Link>
                      {item.status === "queued" ? (
                        <button
                          type="button"
                          disabled={acting === item.id}
                          onClick={() => void handleAssign(item.id)}
                          className="rounded-lg bg-violet-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                        >
                          {t("takeCase")}
                        </button>
                      ) : null}
                      {item.status === "assigned" ? (
                        <button
                          type="button"
                          disabled={acting === `${item.id}-in_progress`}
                          onClick={() => void handleStatus(item.id, "in_progress")}
                          className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
                        >
                          {t("startWork")}
                        </button>
                      ) : null}
                      {item.status === "in_progress" ? (
                        <button
                          type="button"
                          disabled={acting === `${item.id}-completed`}
                          onClick={() => void handleStatus(item.id, "completed")}
                          className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                        >
                          {t("markComplete")}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Link
          href="/profile"
          className="mt-8 inline-flex text-sm font-semibold text-violet-900 hover:underline"
        >
          {t("staffProfile")} →
        </Link>
      </main>
    </div>
  );
}
