"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getMe } from "@/lib/api";
import { ComplaintReporterSummary } from "@/components/ComplaintReporterSummary";
import { useMounted } from "@/hooks/use-mounted";
import { isSuperAdminRole } from "@/lib/admin";
import { listAdminComplaints } from "@/lib/admin-complaints";
import type { MemberComplaintItem, MemberComplaintStatus } from "@/lib/member-complaints";

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

const STATUS_FILTERS: Array<MemberComplaintStatus | "all"> = [
  "all",
  "submitted",
  "assigned",
  "in_progress",
  "resolved",
  "dismissed",
  "cancelled",
];

export function AdminComplaintsDashboard() {
  const router = useRouter();
  const t = useTranslations("admin.complaints");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<MemberComplaintItem[]>([]);
  const [filter, setFilter] = useState<MemberComplaintStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }
    try {
      const me = await getMe(token);
      if (!isSuperAdminRole(me.role)) {
        router.replace("/auth");
        return;
      }
      const rows = await listAdminComplaints(
        token,
        filter === "all" ? undefined : filter,
      );
      setComplaints(rows);
    } catch {
      router.replace("/auth");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="space-y-3">
          <Link href="/admin/home" className="text-sm font-medium text-zinc-600 hover:underline">
            {t("backAdmin")}
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="text-zinc-600">{t("subtitle")}</p>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setLoading(true);
                setFilter(value);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === value
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              {value === "all" ? t("filterAll") : t(`status.${value}`)}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <section className="mt-8 space-y-4">
          {complaints.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
              {t("empty")}
            </p>
          ) : (
            <ul className="space-y-3">
              {complaints.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/admin/complaints/${item.id}`}
                    className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-400"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-900">
                          {t("againstProfile", {
                            code: item.targetProfile?.profileCode ?? "—",
                          })}
                        </p>
                        <ComplaintReporterSummary
                          namespace="admin.complaints"
                          reporter={item.reporter}
                        />
                        <p className="mt-1 text-sm text-zinc-500">
                          {t(`categories.${item.category}`)} ·{" "}
                          {item.assignedConsultantName
                            ? t("assignedTo", { name: item.assignedConsultantName })
                            : t("unassigned")}{" "}
                          · {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(item.status)}`}
                      >
                        {t(`status.${item.status}`)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
