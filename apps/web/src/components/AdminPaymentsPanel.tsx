"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  getAdminMembershipPayment,
  listAdminMembershipPayments,
  type AdminPaymentFilter,
  type AdminPaymentRow,
  type AdminPaymentStats,
} from "@/lib/admin-payments";

function statusClass(status: string) {
  switch (status) {
    case "validated":
      return "bg-emerald-100 text-emerald-800";
    case "pending":
      return "bg-amber-100 text-amber-900";
    case "failed":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-zinc-200 text-zinc-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

function display(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

function formatMoney(amount: string, currency = "BDT") {
  return `৳${amount} ${currency}`;
}

export function AdminPaymentsPanel({
  onError,
  defaultFilter = "validated",
  showStats = true,
  pageSize = 25,
}: {
  onError: (message: string | null) => void;
  defaultFilter?: AdminPaymentFilter;
  showStats?: boolean;
  pageSize?: number;
}) {
  const t = useTranslations("admin.payments");
  const tc = useTranslations("common");

  const [items, setItems] = useState<AdminPaymentRow[]>([]);
  const [stats, setStats] = useState<AdminPaymentStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AdminPaymentFilter>(defaultFilter);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailJson, setDetailJson] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setLoading(true);
    onError(null);
    try {
      const data = await listAdminMembershipPayments(token, {
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
  const maxTrendRevenue = Math.max(
    1,
    ...(stats?.dailyTrend.map((d) => Number(d.revenueBdt)) ?? [1]),
  );

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  async function toggleDetail(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailJson(null);
      return;
    }

    setExpandedId(id);
    setDetailJson(null);
    setDetailLoading(true);

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setDetailLoading(false);
      return;
    }

    try {
      const detail = await getAdminMembershipPayment(token, id);
      setDetailJson(JSON.stringify(detail.sslResponse, null, 2));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("detailError"));
      setExpandedId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-300 bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">{t("title")}</h2>
            <p className="text-sm text-zinc-600">{t("hint")}</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
            {t("count", { count: total })}
          </span>
        </div>

        {stats && showStats ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t("stats.revenueAllTime")}
                value={formatMoney(stats.revenue.allTimeBdt)}
                sub={t("stats.paymentsCount", {
                  count: stats.revenue.allTimeCount,
                })}
              />
              <StatCard
                label={t("stats.revenueMonth")}
                value={formatMoney(stats.revenue.monthBdt)}
                sub={t("stats.paymentsCount", {
                  count: stats.revenue.monthCount,
                })}
              />
              <StatCard
                label={t("stats.revenueWeek")}
                value={formatMoney(stats.revenue.weekBdt)}
                sub={t("stats.paymentsCount", {
                  count: stats.revenue.weekCount,
                })}
              />
              <StatCard
                label={t("stats.revenueToday")}
                value={formatMoney(stats.revenue.todayBdt)}
                sub={t("stats.paymentsCount", {
                  count: stats.revenue.todayCount,
                })}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t("stats.validated")}
                value={String(stats.byStatus.validated)}
                sub={t("stats.successRate", {
                  rate: stats.successRatePercent,
                })}
              />
              <StatCard
                label={t("stats.pending")}
                value={String(stats.byStatus.pending)}
                sub={t("stats.totalInitiated", {
                  count: stats.totalInitiated,
                })}
              />
              <StatCard
                label={t("stats.activeMembers")}
                value={String(stats.activeMembers.total)}
                sub={t("stats.activeBreakdown", {
                  gold: stats.activeMembers.gold,
                  platinum: stats.activeMembers.platinum,
                })}
              />
              <StatCard
                label={t("stats.lastPayment")}
                value={
                  stats.lastValidatedAt
                    ? new Date(stats.lastValidatedAt).toLocaleDateString()
                    : "—"
                }
                sub={t("stats.lastPaymentHint")}
              />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <h3 className="text-sm font-bold text-zinc-900">
                  {t("stats.byPlanTitle")}
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-600">{t("stats.gold")}</dt>
                    <dd className="font-semibold text-zinc-900">
                      {stats.byPlan.gold.count} ·{" "}
                      {formatMoney(stats.byPlan.gold.revenueBdt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-600">{t("stats.platinum")}</dt>
                    <dd className="font-semibold text-zinc-900">
                      {stats.byPlan.platinum.count} ·{" "}
                      {formatMoney(stats.byPlan.platinum.revenueBdt)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <h3 className="text-sm font-bold text-zinc-900">
                  {t("stats.statusBreakdown")}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-800">
                    {t("status.validated")}: {stats.byStatus.validated}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-900">
                    {t("status.pending")}: {stats.byStatus.pending}
                  </span>
                  <span className="rounded-full bg-red-100 px-2 py-1 font-medium text-red-800">
                    {t("status.failed")}: {stats.byStatus.failed}
                  </span>
                  <span className="rounded-full bg-zinc-200 px-2 py-1 font-medium text-zinc-700">
                    {t("status.cancelled")}: {stats.byStatus.cancelled}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-bold text-zinc-900">
                {t("stats.trendTitle")}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">{t("stats.trendHint")}</p>
              <div className="mt-4 flex h-28 items-end gap-1 overflow-x-auto pb-1">
                {stats.dailyTrend.map((day) => {
                  const height = Math.max(
                    4,
                    (Number(day.revenueBdt) / maxTrendRevenue) * 100,
                  );
                  return (
                    <div
                      key={day.date}
                      className="flex min-w-[18px] flex-1 flex-col items-center gap-1"
                      title={t("stats.trendTooltip", {
                        date: day.date,
                        count: day.count,
                        revenue: day.revenueBdt,
                      })}
                    >
                      <div
                        className="w-full rounded-t bg-rose-700/80"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[9px] text-zinc-400">
                        {day.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-300 bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-wrap gap-2">
          {(
            ["all", "validated", "pending", "failed", "cancelled"] as const
          ).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                filter === value
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {t(`filters.${value}`)}
            </button>
          ))}
        </div>

        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setAppliedSearch(search.trim());
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="field-input min-w-[220px] flex-1"
          />
          <button
            type="submit"
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
          >
            {t("search")}
          </button>
        </form>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-600">{tc("loading")}</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-600">{t("empty")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  <th className="px-2 py-2">{t("columns.paidOn")}</th>
                  <th className="px-2 py-2">{t("columns.member")}</th>
                  <th className="px-2 py-2">{t("columns.plan")}</th>
                  <th className="px-2 py-2">{t("columns.amount")}</th>
                  <th className="px-2 py-2">{t("columns.status")}</th>
                  <th className="px-2 py-2">{t("columns.tranId")}</th>
                  <th className="px-2 py-2">{t("columns.valId")}</th>
                  <th className="px-2 py-2">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const expanded = expandedId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-b border-zinc-100 align-top">
                        <td className="px-2 py-3 text-xs text-zinc-600">
                          <p className="font-medium text-zinc-800">
                            {formatDate(row.validatedAt ?? row.createdAt)}
                          </p>
                          {row.validatedAt && row.createdAt !== row.validatedAt ? (
                            <p className="mt-1 text-zinc-500">
                              {t("initiatedAt", {
                                date: formatDate(row.createdAt),
                              })}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-3">
                          <p className="font-medium text-zinc-900">
                            {display(row.member.fullName)}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {display(row.member.profileCode)}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {display(row.member.phone)}
                          </p>
                        </td>
                        <td className="px-2 py-3 capitalize">{row.plan}</td>
                        <td className="px-2 py-3 font-semibold text-zinc-900">
                          {formatMoney(row.amountBdt, row.currency)}
                          <p className="text-xs font-normal text-zinc-500">
                            {t("durationDays", { days: row.durationDays })}
                          </p>
                        </td>
                        <td className="px-2 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}
                          >
                            {t(`status.${row.status}` as "status.validated")}
                          </span>
                          {row.sslStatus ? (
                            <p className="mt-1 text-[11px] text-zinc-500">
                              SSL: {row.sslStatus}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-3 font-mono text-xs text-zinc-700">
                          {row.tranId}
                        </td>
                        <td className="px-2 py-3 font-mono text-xs text-zinc-700">
                          {display(row.valId)}
                        </td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => void toggleDetail(row.id)}
                            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          >
                            {expanded ? t("hideDetail") : t("viewDetail")}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-zinc-50">
                          <td colSpan={8} className="px-4 py-3">
                            {detailLoading ? (
                              <p className="text-xs text-zinc-600">
                                {tc("loading")}
                              </p>
                            ) : (
                              <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-800">
                                {detailJson ?? t("noSslResponse")}
                              </pre>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 font-semibold text-zinc-700 disabled:opacity-40"
            >
              {t("prevPage")}
            </button>
            <span className="text-zinc-600">
              {t("pageOf", { page, total: totalPages })}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 font-semibold text-zinc-700 disabled:opacity-40"
            >
              {t("nextPage")}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="text-lg font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-600">{sub}</p>
    </div>
  );
}
