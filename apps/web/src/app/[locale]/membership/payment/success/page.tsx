"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { notifyAuthChanged } from "@/lib/auth-session";
import { confirmMembershipPayment } from "@/lib/membership-checkout";
import { useMobileMembershipCheckoutResult } from "@/hooks/use-mobile-membership-checkout-result";
import { isMobileCheckoutSession } from "@/lib/mobile-membership-checkout";

export default function MembershipPaymentSuccessPage() {
  const t = useTranslations("membership.payment");
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [isPaidMember, setIsPaidMember] = useState(false);
  const fromMobile = isMobileCheckoutSession();

  useMobileMembershipCheckoutResult("success", ready);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setReady(true);
      return;
    }

    const tranId = searchParams.get("tran_id") ?? undefined;
    const valId = searchParams.get("val_id") ?? undefined;

    confirmMembershipPayment(token, { tranId, valId })
      .then((result) => {
        setIsPaidMember(result.isPaidMember);
        notifyAuthChanged();
      })
      .catch(() => {
        notifyAuthChanged();
      })
      .finally(() => setReady(true));
  }, [searchParams]);

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h1 className="text-xl font-bold text-emerald-900">{t("successTitle")}</h1>
        <p className="mt-3 text-sm text-emerald-800">
          {ready && fromMobile
            ? t("mobileReturnSuccess")
            : ready && isPaidMember
              ? t("successBody")
              : ready
                ? t("successPending")
                : t("successActivating")}
        </p>
        {!fromMobile ? (
          <Link
            href="/membership"
            className="mt-6 inline-block rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            {t("backToMembership")}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
