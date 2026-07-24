"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function ConsultantPaymentCancelPage() {
  const t = useTranslations("consultant.payment");

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h1 className="text-xl font-bold text-amber-950">{t("cancelTitle")}</h1>
        <p className="mt-3 text-sm text-amber-900">{t("cancelBody")}</p>
        <Link
          href="/connections"
          className="mt-6 inline-block rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950"
        >
          {t("backToConnections")}
        </Link>
      </div>
    </main>
  );
}
