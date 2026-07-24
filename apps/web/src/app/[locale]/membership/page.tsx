"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  canPurchaseMembership,
  membershipFromSession,
  resolveMembershipPurchaseEligibility,
  type MembershipPurchaseEligibility,
} from "@/lib/membership";
import { getMembershipTariffs, type MembershipTariff } from "@/lib/membership-tariffs";
import { startMembershipCheckout, confirmMembershipPayment } from "@/lib/membership-checkout";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { notifyAuthChanged } from "@/lib/auth-session";
import { formatTariffPriceBdt } from "@easymatch/shared";
import { PaidMembershipRequired } from "@/components/PaidMembershipRequired";
import { MemberSubscriptionPanel } from "@/components/MemberSubscriptionPanel";
import { markMobileCheckoutSession } from "@/lib/mobile-membership-checkout";

export default function MembershipPage() {
  const t = useTranslations("membership");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const fromMobile = searchParams.get("from") === "mobile";
  const { user, ready, loggedIn } = useAuthSession();
  const isPaid = membershipFromSession(user);
  const [eligibility, setEligibility] =
    useState<MembershipPurchaseEligibility | null>(null);
  const [eligibilityReady, setEligibilityReady] = useState(false);
  const [tariffs, setTariffs] = useState<MembershipTariff[]>([]);
  const [tariffsError, setTariffsError] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const canPay =
    loggedIn && canPurchaseMembership(user, eligibility);

  useEffect(() => {
    if (fromMobile) {
      markMobileCheckoutSession();
    }
  }, [fromMobile]);

  useEffect(() => {
    if (!ready || !loggedIn || isPaid) return;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    confirmMembershipPayment(token)
      .then((result) => {
        if (result.isPaidMember) {
          notifyAuthChanged();
        }
      })
      .catch(() => {});
  }, [loggedIn, ready, isPaid]);

  useEffect(() => {
    getMembershipTariffs()
      .then(setTariffs)
      .catch((err) =>
        setTariffsError(err instanceof Error ? err.message : t("plansLoadError")),
      );
  }, [t]);

  useEffect(() => {
    if (!ready) {
      setEligibilityReady(false);
      return;
    }

    if (!loggedIn) {
      setEligibility(null);
      setEligibilityReady(true);
      return;
    }

    setEligibility(
      resolveMembershipPurchaseEligibility({
        sessionHasProfile: user?.hasProfile,
        sessionIsVerified: user?.isVerified,
      }),
    );
    setEligibilityReady(true);
  }, [loggedIn, ready, user?.hasProfile, user?.isVerified]);

  function tariffLabel(tariff: MembershipTariff) {
    return locale === "bn" && tariff.labelBn ? tariff.labelBn : tariff.labelEn;
  }

  function tariffDescription(tariff: MembershipTariff) {
    return locale === "bn" && tariff.descriptionBn
      ? tariff.descriptionBn
      : tariff.descriptionEn;
  }

  async function handleCheckout(plan: string) {
    setCheckoutError(null);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setCheckoutError(t("signInRequired"));
      return;
    }

    let purchaseEligibility = eligibility;
    if (!purchaseEligibility) {
      purchaseEligibility = resolveMembershipPurchaseEligibility({
        sessionHasProfile: user?.hasProfile,
        sessionIsVerified: user?.isVerified,
      });
      setEligibility(purchaseEligibility);
    }

    if (!canPurchaseMembership(user, purchaseEligibility)) {
      setCheckoutError(
        !purchaseEligibility.hasProfile
          ? t("profileRequired")
          : t("verificationRequired"),
      );
      return;
    }

    setCheckoutPlan(plan);
    try {
      const result = await startMembershipCheckout(token, plan);
      window.location.href = result.gatewayUrl;
    } catch (err) {
      setCheckoutPlan(null);
      setCheckoutError(
        err instanceof Error ? err.message : t("checkoutError"),
      );
    }
  }

  const showProfileRequired =
    loggedIn &&
    ready &&
    eligibilityReady &&
    !isPaid &&
    eligibility &&
    !eligibility.hasProfile;

  const showVerificationRequired =
    loggedIn &&
    ready &&
    eligibilityReady &&
    !isPaid &&
    eligibility &&
    eligibility.hasProfile &&
    !eligibility.isVerified;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {!fromMobile ? (
        <Link href="/" className="text-sm font-medium text-rose-800 hover:underline">
          {t("backHome")}
        </Link>
      ) : null}

      <h1 className="mt-4 text-2xl font-bold text-zinc-900">{t("title")}</h1>
      <p className="mt-2 text-zinc-600">
        {fromMobile ? t("mobileCheckoutIntro") : t("subtitle")}
      </p>

      {ready && isPaid ? (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t("alreadyPaid")}
        </p>
      ) : null}

      {ready && loggedIn ? (
        <MemberSubscriptionPanel tariffs={tariffs} />
      ) : null}

      {checkoutError ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {checkoutError}
        </p>
      ) : null}

      {!loggedIn && ready ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("signInRequired")}{" "}
          <Link href="/auth" className="font-semibold underline">
            {t("signInLink")}
          </Link>
        </p>
      ) : null}

      {showProfileRequired ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("profileRequired")}{" "}
          <Link href="/profile" className="font-semibold underline">
            {t("createProfileLink")}
          </Link>
        </p>
      ) : null}

      {showVerificationRequired ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("verificationRequired")}{" "}
          <Link href="/profile" className="font-semibold underline">
            {t("completeVerificationLink")}
          </Link>
        </p>
      ) : null}

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">{t("freeTitle")}</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-zinc-700">
          <li>{t("free.browse")}</li>
          <li>{t("free.profile")}</li>
          <li>{t("free.verification")}</li>
        </ul>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">{t("paidTitle")}</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-zinc-700">
          <li>{t("paid.interest")}</li>
          <li>{t("paid.messages")}</li>
          <li>{t("paid.videoCalls")}</li>
          <li>{t("paid.biodataPdf")}</li>
        </ul>
        <p className="text-sm text-zinc-600">{t("verifiedOnlyNote")}</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">{t("plansTitle")}</h2>
        {tariffsError ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            {tariffsError}
          </p>
        ) : null}
        {tariffs.length === 0 && !tariffsError ? (
          <p className="text-sm text-zinc-600">{t("plansEmpty")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tariffs.map((tariff) => {
              const paying = checkoutPlan === tariff.plan;
              const payDisabled = !canPay || paying || !eligibilityReady;
              return (
                <article
                  key={tariff.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="text-base font-semibold text-zinc-900">
                    {tariffLabel(tariff)}
                  </h3>
                  <p className="mt-2 text-2xl font-bold text-rose-900">
                    {t("priceLabel", {
                      price: formatTariffPriceBdt(tariff.priceBdt),
                      currency: tariff.currency,
                    })}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {t("durationLabel", { days: tariff.durationDays })}
                  </p>
                  {tariffDescription(tariff) ? (
                    <p className="mt-3 text-sm text-zinc-700">
                      {tariffDescription(tariff)}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={payDisabled}
                    onClick={() => handleCheckout(tariff.plan)}
                    className="mt-4 w-full rounded-lg bg-rose-900 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-950 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
                  >
                    {paying ? t("redirecting") : t("payWithSslCommerz")}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8">
        {!isPaid && !fromMobile ? <PaidMembershipRequired feature="connect" /> : null}
      </div>

      {!fromMobile ? (
        <p className="mt-6 text-sm text-zinc-500">{t("paymentSandboxNote")}</p>
      ) : null}
    </main>
  );
}
