"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function ConsultantPaymentFailPage() {
  const t = useTranslations("consultant.payment");

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h1 className="text-xl font-bold text-red-900">{t("failTitle")}</h1>
        <p className="mt-3 text-sm text-red-800">{t("failBody")}</p>
        <Link
          href="/connections"
          className="mt-6 inline-block rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900"
        >
          {t("backToConnections")}
        </Link>
      </div>
    </main>
  );
}
