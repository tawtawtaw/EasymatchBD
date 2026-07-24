"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { confirmConsultantPayment } from "@/lib/consultant-engagements";

export default function ConsultantPaymentSuccessPage() {
  const t = useTranslations("consultant.payment");
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [queued, setQueued] = useState(false);
  const connectionId = searchParams.get("connection_id") ?? undefined;

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setReady(true);
      return;
    }

    const tranId = searchParams.get("tran_id") ?? undefined;
    const valId = searchParams.get("val_id") ?? undefined;

    confirmConsultantPayment(token, { tranId, valId })
      .then((result) => {
        setQueued(result.engagement?.status === "queued" || result.synced);
      })
      .catch(() => {
        setQueued(false);
      })
      .finally(() => setReady(true));
  }, [searchParams]);

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h1 className="text-xl font-bold text-emerald-900">{t("successTitle")}</h1>
        <p className="mt-3 text-sm text-emerald-800">
          {ready && queued ? t("successBody") : ready ? t("successPending") : t("successActivating")}
        </p>
        <Link
          href="/connections"
          className="mt-6 inline-block rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
        >
          {t("backToConnections")}
        </Link>
        {connectionId ? (
          <p className="mt-3 text-xs text-emerald-700">{t("connectionNote")}</p>
        ) : null}
      </div>
    </main>
  );
}
