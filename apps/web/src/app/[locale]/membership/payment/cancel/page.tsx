"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useMobileMembershipCheckoutResult } from "@/hooks/use-mobile-membership-checkout-result";
import { isMobileCheckoutSession } from "@/lib/mobile-membership-checkout";

export default function MembershipPaymentCancelPage() {
  const t = useTranslations("membership.payment");
  const [ready, setReady] = useState(false);
  const fromMobile = isMobileCheckoutSession();

  useEffect(() => {
    setReady(true);
  }, []);

  useMobileMembershipCheckoutResult("cancel", ready);

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <h1 className="text-xl font-bold text-zinc-900">{t("cancelTitle")}</h1>
        <p className="mt-3 text-sm text-zinc-700">
          {fromMobile ? t("mobileReturnCancel") : t("cancelBody")}
        </p>
        {!fromMobile ? (
          <Link
            href="/membership"
            className="mt-6 inline-block rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            {t("backToMembership")}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
