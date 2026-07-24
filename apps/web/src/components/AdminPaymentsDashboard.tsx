"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getMe } from "@/lib/api";
import { isSuperAdminRole } from "@/lib/admin";
import { AdminConsultantPaymentsPanel } from "@/components/AdminConsultantPaymentsPanel";
import { AdminPaymentsPanel } from "@/components/AdminPaymentsPanel";

export function AdminPaymentsDashboard() {
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentTab, setPaymentTab] = useState<"membership" | "consultant">(
    "membership",
  );

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    getMe(token)
      .then((user) => {
        setAuthorized(isSuperAdminRole(user.role));
      })
      .catch(() => router.replace("/auth"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-700">
        {tc("loading")}
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold text-zinc-900">{t("accessDenied")}</p>
        <p className="max-w-md text-sm text-zinc-600">{t("accessDeniedHint")}</p>
        <Link href="/admin/home" className="text-sm font-medium text-rose-700 hover:underline">
          {tc("home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link
            href="/admin/home"
            className="text-sm font-medium text-rose-700 hover:underline"
          >
            ← {t("paymentsDashboard.backToHome")}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">
            {t("paymentsDashboard.title")}
          </h1>
          <p className="text-sm text-zinc-600">{t("paymentsDashboard.subtitle")}</p>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPaymentTab("membership")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              paymentTab === "membership"
                ? "bg-rose-800 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {t("paymentsDashboard.tabMembership")}
          </button>
          <button
            type="button"
            onClick={() => setPaymentTab("consultant")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              paymentTab === "consultant"
                ? "bg-rose-800 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {t("paymentsDashboard.tabConsultant")}
          </button>
        </div>

        {paymentTab === "membership" ? (
          <AdminPaymentsPanel onError={setError} defaultFilter="validated" />
        ) : (
          <AdminConsultantPaymentsPanel onError={setError} defaultFilter="validated" />
        )}
      </div>
    </div>
  );
}
