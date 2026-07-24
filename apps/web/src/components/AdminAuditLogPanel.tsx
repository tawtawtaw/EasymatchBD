"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getMe } from "@/lib/api";
import { useMounted } from "@/hooks/use-mounted";
import { isSuperAdminRole } from "@/lib/admin";
import {
  listAdminAuditLog,
  type StaffActivityCategory,
  type StaffActivityLogItem,
} from "@/lib/admin-audit-log";

const CATEGORY_FILTERS: Array<StaffActivityCategory | "all"> = [
  "all",
  "admin",
  "verification",
  "consultant",
  "complaints",
];

function roleLabel(role: string, t: ReturnType<typeof useTranslations>) {
  const known = [
    "super_admin",
    "verification_officer",
    "marriage_consultant",
  ] as const;
  if (known.includes(role as (typeof known)[number])) {
    return t(`roles.${role}` as "roles.super_admin");
  }
  return role;
}

export function AdminAuditLogPanel() {
  const router = useRouter();
  const t = useTranslations("admin.auditLog");
  const tCommon = useTranslations("common");
  const mounted = useMounted();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<StaffActivityLogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<StaffActivityCategory | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (append = false, nextCursor?: string | null) => {
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
        const page = await listAdminAuditLog(token, {
          category: filter === "all" ? undefined : filter,
          cursor: append ? nextCursor ?? undefined : undefined,
          limit: 50,
        });
        setItems((prev) => (append ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("loadError"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, router, t],
  );

  useEffect(() => {
    if (!mounted) return;
    setLoading(true);
    void loadPage(false);
  }, [mounted, loadPage]);

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{tCommon("loading")}</p>
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
          <p className="text-sm text-zinc-500">{t("retentionNote")}</p>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((value) => (
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
              {value === "all" ? t("filterAll") : t(`categories.${value}`)}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <section className="mt-8">
          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
              {t("empty")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">{t("columns.when")}</th>
                    <th className="px-4 py-3">{t("columns.staff")}</th>
                    <th className="px-4 py-3">{t("columns.category")}</th>
                    <th className="px-4 py-3">{t("columns.summary")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">
                          {item.actorName ?? item.actorId.slice(0, 8)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {roleLabel(item.actorRole, t)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {t(`categories.${item.category}`)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        <p>{item.summary}</p>
                        {item.path ? (
                          <p className="mt-0.5 font-mono text-xs text-zinc-400">{item.path}</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cursor ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => {
                  setLoadingMore(true);
                  void loadPage(true, cursor);
                }}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                {loadingMore ? tCommon("loading") : t("loadMore")}
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
