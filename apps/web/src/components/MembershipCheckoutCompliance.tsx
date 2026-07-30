"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ServiceDeliveryTimelineTable } from "@/components/ServiceDeliveryTimelineTable";

type MembershipCheckoutComplianceProps = {
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
  disabled?: boolean;
};

const TIMELINE_ROW_KEYS = [
  "freeRegistration",
  "biodataReview",
  "paidMembership",
  "profileVerification",
  "interestProcessing",
  "familyContact",
] as const;

const policyLinkClass =
  "font-semibold text-rose-900 underline underline-offset-2 hover:text-rose-950";

export function MembershipCheckoutCompliance({
  accepted,
  onAcceptedChange,
  disabled,
}: MembershipCheckoutComplianceProps) {
  const t = useTranslations("membership.checkoutCompliance");
  const tDelivery = useTranslations("serviceDeliveryPage.timelineTable");

  const deliveryRows = useMemo(
    () =>
      TIMELINE_ROW_KEYS.map((key) => ({
        service: tDelivery(`rows.${key}.service`),
        timeline: tDelivery(`rows.${key}.timeline`),
        remarks: tDelivery(`rows.${key}.remarks`),
      })),
    [tDelivery],
  );

  return (
    <section className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
      <h2 className="text-base font-semibold text-zinc-900">{t("title")}</h2>
      <p className="text-sm leading-relaxed text-zinc-700">{t("refundSummary")}</p>
      <p className="text-sm leading-relaxed text-zinc-700">{t("deliveryIntro")}</p>

      <ServiceDeliveryTimelineTable
        title={tDelivery("title")}
        columns={{
          service: tDelivery("columns.service"),
          timeline: tDelivery("columns.timeline"),
          remarks: tDelivery("columns.remarks"),
        }}
        rows={deliveryRows}
        compact
      />

      <p className="text-sm leading-relaxed text-zinc-700">
        {t("policyLinksIntro")}{" "}
        <Link href="/refund" className={policyLinkClass}>
          {t("refundLink")}
        </Link>
        {" · "}
        <Link href="/service-delivery" className={policyLinkClass}>
          {t("deliveryLink")}
        </Link>
      </p>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-rose-900 focus:ring-rose-800"
          checked={accepted}
          disabled={disabled}
          onChange={(event) => onAcceptedChange(event.target.checked)}
        />
        <span className="text-sm leading-relaxed text-zinc-800">
          {t.rich("agreement", {
            terms: (chunks) => (
              <Link href="/terms" className={policyLinkClass}>
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className={policyLinkClass}>
                {chunks}
              </Link>
            ),
            cookies: (chunks) => (
              <Link href="/cookies" className={policyLinkClass}>
                {chunks}
              </Link>
            ),
            paymentSecurity: (chunks) => (
              <Link href="/payment-security" className={policyLinkClass}>
                {chunks}
              </Link>
            ),
            refund: (chunks) => (
              <Link href="/refund" className={policyLinkClass}>
                {chunks}
              </Link>
            ),
            serviceDelivery: (chunks) => (
              <Link href="/service-delivery" className={policyLinkClass}>
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      {!accepted ? (
        <p className="text-xs text-zinc-500">{t("checkboxRequired")}</p>
      ) : null}
    </section>
  );
}
