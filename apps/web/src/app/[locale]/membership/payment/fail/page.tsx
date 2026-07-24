"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useMobileMembershipCheckoutResult } from "@/hooks/use-mobile-membership-checkout-result";
import { isMobileCheckoutSession } from "@/lib/mobile-membership-checkout";

export default function MembershipPaymentFailPage() {
  const t = useTranslations("membership.payment");
  const [ready, setReady] = useState(false);
  const fromMobile = isMobileCheckoutSession();

  useEffect(() => {
    setReady(true);
  }, []);

  useMobileMembershipCheckoutResult("fail", ready);

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h1 className="text-xl font-bold text-red-900">{t("failTitle")}</h1>
        <p className="mt-3 text-sm text-red-800">
          {fromMobile ? t("mobileReturnFail") : t("failBody")}
        </p>
        {!fromMobile ? (
          <Link
            href="/membership"
            className="mt-6 inline-block rounded-lg bg-rose-900 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-950"
          >
            {t("tryAgain")}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
