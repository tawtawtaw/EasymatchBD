"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  listAdminConsultantPayments,
  type AdminConsultantPaymentRow,
  type AdminConsultantPaymentStats,
  type AdminPaymentFilter,
} from "@/lib/admin-payments";

function statusClass(status: string) {
  switch (status) {
    case "validated":
      return "bg-emerald-100 text-emerald-800";
    case "pending":
      return "bg-amber-100 text-amber-900";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

function display(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

export function AdminConsultantPaymentsPanel({
  onError,
  defaultFilter = "validated",
  pageSize = 25,
}: {
  onError: (message: string | null) => void;
  defaultFilter?: AdminPaymentFilter;
  pageSize?: number;
}) {
  const t = useTranslations("admin.consultantPayments");
  const tp = useTranslations("admin.payments");
  const tc = useTranslations("common");

  const [items, setItems] = useState<AdminConsultantPaymentRow[]>([]);
  const [stats, setStats] = useState<AdminConsultantPaymentStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AdminPaymentFilter>(defaultFilter);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const loadList = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setLoading(true);
    onError(null);
    try {
      const data = await listAdminConsultantPayments(token, {
        page,
        limit: pageSize,
        q: appliedSearch || undefined,
        filter,
      });
      setItems(data.items);
      setTotal(data.total);
      setStats(data.stats);
    } catch (err) {
      onError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, filter, onError, page, pageSize, t]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("hint")}</p>
      </div>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">{tp("stats.revenueAllTime")}</p>
            <p className="text-xl font-bold text-zinc-900">
              ৳{stats.revenue.allTimeBdt}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">{tp("stats.validated")}</p>
            <p className="text-xl font-bold text-zinc-900">
              {stats.byStatus.validated}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">{tp("stats.pending")}</p>
            <p className="text-xl font-bold text-zinc-900">
              {stats.byStatus.pending}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">{tp("stats.successRate")}</p>
            <p className="text-xl font-bold text-zinc-900">
              {stats.successRatePercent}%
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {(["all", "validated", "pending", "failed", "cancelled"] as const).map(
          (key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                filter === key
                  ? "bg-rose-800 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {tp(`filters.${key}`)}
            </button>
          ),
        )}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedSearch(search.trim());
          setPage(1);
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-w-[240px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {tp("search")}
        </button>
      </form>

      {loading ? (
        <p className="text-zinc-600">{tc("loading")}</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">{t("columns.paidOn")}</th>
                <th className="px-4 py-3">{t("columns.member")}</th>
                <th className="px-4 py-3">{t("columns.service")}</th>
                <th className="px-4 py-3">{t("columns.amount")}</th>
                <th className="px-4 py-3">{t("columns.status")}</th>
                <th className="px-4 py-3">{t("columns.tranId")}</th>
                <th className="px-4 py-3">{t("columns.valId")}</th>
                <th className="px-4 py-3">{t("columns.case")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(row.validatedAt ?? row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div>{display(row.member.fullName)}</div>
                    <div className="text-xs text-zinc-500">
                      {display(row.member.profileCode)} · {display(row.member.phone)}
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.serviceLabelEn}</td>
                  <td className="px-4 py-3">৳{row.amountBdt}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}
                    >
                      {tp(`status.${row.status as "validated"}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.tranId}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {display(row.valId)}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {row.engagement
                      ? t("caseStatus", { status: row.engagement.status })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-zinc-600">{t("count", { count: total })}</p>

      {totalPages > 1 ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {tp("prevPage")}
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {tp("nextPage")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
