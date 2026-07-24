"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatTariffPriceBdt } from "@easymatch/shared";
import type { MembershipPaymentReceipt } from "@/lib/membership-account";
import { MEMBERSHIP_RECEIPT_CSS } from "@/lib/pdf-document-styles";

type MembershipReceiptDocumentProps = {
  receipt: MembershipPaymentReceipt;
  planLabel: string;
};

function ReceiptTable({
  rows,
}: {
  rows: { key: string; label: string; value: string }[];
}) {
  return (
    <table className="membership-receipt-table">
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={row.key}
            className={
              index % 2 === 0
                ? "membership-receipt-row-even"
                : "membership-receipt-row-odd"
            }
          >
            <th scope="row" className="membership-receipt-th">
              {row.label}
            </th>
            <td className="membership-receipt-td">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const MembershipReceiptDocument = forwardRef<
  HTMLElement,
  MembershipReceiptDocumentProps
>(function MembershipReceiptDocument({ receipt, planLabel }, ref) {
  const articleRef = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => articleRef.current as HTMLElement);

  const locale = useLocale();
  const t = useTranslations("membership.receipt");

  const paidAt = receipt.validatedAt ?? receipt.createdAt;
  const paidAtLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(paidAt));

  const formatDay = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  };

  const isSubscriptionReceipt = receipt.receiptKind === "subscription";
  const memberName = receipt.member.fullName?.trim() || t("memberFallback");

  const paymentRows = [
    {
      key: "plan",
      label: t("plan"),
      value: planLabel,
    },
    {
      key: "duration",
      label: t("duration"),
      value: t("durationValue", { days: receipt.durationDays }),
    },
    ...(receipt.subscriptionStartsAt
      ? [
          {
            key: "period",
            label: t("subscriptionPeriod"),
            value: t("subscriptionPeriodValue", {
              start: formatDay(receipt.subscriptionStartsAt),
              end: formatDay(receipt.subscriptionEndsAt),
            }),
          },
        ]
      : []),
    {
      key: "method",
      label: t("paymentMethod"),
      value: isSubscriptionReceipt
        ? t("paymentMethodSubscription")
        : t("paymentMethodValue"),
    },
    {
      key: "tranId",
      label: t("transactionId"),
      value: receipt.tranId,
    },
    ...(receipt.valId
      ? [
          {
            key: "valId",
            label: t("validationId"),
            value: receipt.valId,
          },
        ]
      : []),
    {
      key: "paidAt",
      label: isSubscriptionReceipt ? t("activatedAt") : t("paidAt"),
      value: paidAtLabel,
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MEMBERSHIP_RECEIPT_CSS }} />
      <article ref={articleRef} className="membership-receipt-root">
      <header className="membership-receipt-header">
        <div className="membership-receipt-header-main">
          <p className="membership-receipt-brand">{t("brand")}</p>
          <h1 className="membership-receipt-title">{t("title")}</h1>
          <p className="membership-receipt-subtitle">
            {isSubscriptionReceipt ? t("subtitleSubscription") : t("subtitle")}
          </p>
        </div>
        <p className="membership-receipt-paid-banner">
          {isSubscriptionReceipt ? t("activeBanner") : t("paidBanner")}
        </p>
      </header>

      <section className="membership-receipt-section">
        <h2 className="membership-receipt-section-title">{t("memberSection")}</h2>
        <ReceiptTable
          rows={[
            {
              key: "name",
              label: t("memberName"),
              value: memberName,
            },
            ...(receipt.member.profileCode
              ? [
                  {
                    key: "profileCode",
                    label: t("profileCode"),
                    value: receipt.member.profileCode,
                  },
                ]
              : []),
            ...(receipt.member.phone
              ? [
                  {
                    key: "phone",
                    label: t("phone"),
                    value: receipt.member.phone,
                  },
                ]
              : []),
          ]}
        />
      </section>

      <section className="membership-receipt-section">
        <h2 className="membership-receipt-section-title">{t("paymentSection")}</h2>
        <ReceiptTable rows={paymentRows} />
      </section>

      <div className="membership-receipt-amount">
        <p className="membership-receipt-amount-label">{t("amountPaid")}</p>
        <p className="membership-receipt-amount-value">
          {t("amountValue", {
            amount: formatTariffPriceBdt(receipt.amountBdt),
            currency: receipt.currency,
          })}
        </p>
      </div>

      <footer className="membership-receipt-footer">{t("footer")}</footer>
    </article>
    </>
  );
});
