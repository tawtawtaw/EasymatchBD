"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  listAdminMembershipPayments,
  type AdminPaymentRow,
  type AdminPaymentStats,
} from "@/lib/admin-payments";

function display(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

function formatMoney(amount: string, currency = "BDT") {
  return `৳${amount} ${currency}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminPaymentsRecentSection({ token }: { token: string }) {
  const t = useTranslations("adminHome.payments");
  const tc = useTranslations("common");
  const [items, setItems] = useState<AdminPaymentRow[]>([]);
  const [stats, setStats] = useState<AdminPaymentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await listAdminMembershipPayments(token, {
          page: 1,
          limit: 8,
          filter: "validated",
        });
        if (cancelled) return;
        setItems(data.items);
        setStats(data.stats);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">{t("title")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("subtitle")}</p>
        </div>
        <Link
          href="/admin/payments"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          {t("viewAll")} →
        </Link>
      </div>

      {stats ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              {t("stats.validated")}
            </p>
            <p className="text-lg font-bold text-zinc-900">
              {stats.byStatus.validated}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              {t("stats.revenue")}
            </p>
            <p className="text-lg font-bold text-zinc-900">
              ৳{stats.revenue.allTimeBdt}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              {t("stats.lastPayment")}
            </p>
            <p className="text-lg font-bold text-zinc-900">
              {stats.lastValidatedAt
                ? new Date(stats.lastValidatedAt).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-zinc-600">{tc("loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">{t("empty")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wide text-zinc-500">
                <th className="px-2 py-2">{t("columns.paidOn")}</th>
                <th className="px-2 py-2">{t("columns.member")}</th>
                <th className="px-2 py-2">{t("columns.plan")}</th>
                <th className="px-2 py-2">{t("columns.amount")}</th>
                <th className="px-2 py-2">{t("columns.tranId")}</th>
                <th className="px-2 py-2">{t("columns.valId")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 align-top">
                  <td className="px-2 py-3 text-xs text-zinc-700">
                    {formatDate(row.validatedAt ?? row.createdAt)}
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
                  </td>
                  <td className="px-2 py-3 font-mono text-xs text-zinc-700">
                    {row.tranId}
                  </td>
                  <td className="px-2 py-3 font-mono text-xs text-zinc-700">
                    {display(row.valId)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
