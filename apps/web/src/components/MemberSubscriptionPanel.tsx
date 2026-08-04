"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { MembershipTariff } from "@easymatch/shared";
import { formatTariffPriceBdt, getMembershipServicePackage } from "@easymatch/shared";
import {
  BiodataFieldRows,
  BiodataSectionShell,
} from "@/components/BiodataFieldRows";
import { MembershipReceiptDocument } from "@/components/MembershipReceiptDocument";
import { useAuthSession } from "@/hooks/use-auth-session";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-session";
import { downloadBiodataPdf, printBiodataPdf } from "@/lib/download-biodata-pdf";
import { membershipFromSession } from "@/lib/membership";
import {
  getMembershipAccount,
  getMembershipPaymentReceipt,
  getMembershipSubscriptionReceipt,
  type MembershipAccountSummary,
  type MembershipPaymentReceipt,
  type MemberPaymentRecord,
} from "@/lib/membership-account";

type MemberSubscriptionPanelProps = {
  tariffs: MembershipTariff[];
};

function planLabel(
  plan: string,
  tariffs: MembershipTariff[],
  locale: string,
) {
  const tariff = tariffs.find((item) => item.plan === plan);
  if (!tariff) {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
  return locale === "bn" && tariff.labelBn ? tariff.labelBn : tariff.labelEn;
}

function formatDate(locale: string, iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function MemberSubscriptionPanel({
  tariffs,
}: MemberSubscriptionPanelProps) {
  const locale = useLocale();
  const t = useTranslations("membership.subscription");
  const { user } = useAuthSession();
  const sessionIsPaid = membershipFromSession(user);
  const [account, setAccount] = useState<MembershipAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [pendingReceiptAction, setPendingReceiptAction] = useState<
    "download" | "print" | null
  >(null);
  const [receiptPlanLabel, setReceiptPlanLabel] = useState("");
  const receiptRef = useRef<HTMLElement>(null);
  const [receiptData, setReceiptData] = useState<MembershipPaymentReceipt | null>(
    null,
  );

  useEffect(() => {
    if (!pendingReceiptAction || !receiptData || !receiptRef.current) {
      return;
    }

    let cancelled = false;
    const action = pendingReceiptAction;
    const activeId = downloadingId ?? printingId;

    async function runReceiptAction() {
      try {
        if (!receiptRef.current) {
          throw new Error(t("receiptError"));
        }
        if (action === "download") {
          await downloadBiodataPdf(
            receiptRef.current,
            `easymatch-receipt-${receiptData!.tranId}.pdf`,
          );
        } else {
          await printBiodataPdf(receiptRef.current);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("receiptError"));
        }
      } finally {
        if (!cancelled) {
          if (activeId === "subscription") {
            setDownloadingId(null);
            setPrintingId(null);
          } else if (activeId) {
            setDownloadingId(null);
            setPrintingId(null);
          }
          setPendingReceiptAction(null);
          setReceiptData(null);
        }
      }
    }

    void runReceiptAction();

    return () => {
      cancelled = true;
    };
  }, [pendingReceiptAction, receiptData, downloadingId, printingId, t]);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getMembershipAccount(token, { forceFresh: sessionIsPaid })
      .then((data) => {
        if (!cancelled) {
          setAccount(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("loadError"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionIsPaid, t]);

  useEffect(() => {
    function onAuthChanged() {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        return;
      }

      setLoading(true);
      setError(null);
      getMembershipAccount(token, { forceFresh: true })
        .then(setAccount)
        .catch((err) => {
          setError(err instanceof Error ? err.message : t("loadError"));
        })
        .finally(() => setLoading(false));
    }

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [t]);

  const subscription = account?.subscription;
  const hasPaidHistory =
    Boolean(subscription && subscription.plan !== "free") ||
    (account?.payments.length ?? 0) > 0;

  if (loading) {
    return (
      <p className="mt-6 text-sm text-zinc-600">{t("loading")}</p>
    );
  }

  if (error) {
    return (
      <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    );
  }

  if (!hasPaidHistory) {
    return null;
  }

  async function loadReceipt(
    payment?: MemberPaymentRecord,
  ): Promise<MembershipPaymentReceipt> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error(t("receiptError"));
    }

    if (payment) {
      return getMembershipPaymentReceipt(token, payment.id);
    }

    return getMembershipSubscriptionReceipt(token);
  }

  async function beginReceiptAction(
    action: "download" | "print",
    payment?: MemberPaymentRecord,
  ) {
    const actionId = payment?.id ?? "subscription";
    setError(null);

    if (action === "download") {
      setDownloadingId(actionId);
    } else {
      setPrintingId(actionId);
    }

    try {
      const receipt = await loadReceipt(payment);
      setReceiptPlanLabel(planLabel(receipt.plan, tariffs, locale));
      setReceiptData(receipt);
      setPendingReceiptAction(action);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("receiptError"));
      setDownloadingId(null);
      setPrintingId(null);
    }
  }

  const statusLabel = subscription?.isPaidMember
    ? t("statusActive")
    : t("statusInactive");

  const periodStartsAt =
    subscription?.currentPeriodStartsAt ?? subscription?.startsAt ?? null;
  const periodEndsAt =
    subscription?.currentPeriodEndsAt ?? subscription?.endsAt ?? null;

  const receiptBusy =
    downloadingId === "subscription" || printingId === "subscription";

  return (
    <div className="mt-6 space-y-5">
      {subscription && subscription.plan !== "free" ? (
        <BiodataSectionShell title={t("title")} theme="emerald">
          <BiodataFieldRows
            theme="emerald"
            rows={[
              {
                key: "plan",
                label: t("plan"),
                value: planLabel(subscription.plan, tariffs, locale),
              },
              {
                key: "startsAt",
                label: t("startsAt"),
                value: formatDate(locale, periodStartsAt),
              },
              {
                key: "endsAt",
                label: t("endsAt"),
                value: formatDate(locale, periodEndsAt),
              },
              {
                key: "status",
                label: t("status"),
                value: statusLabel,
              },
            ]}
          />
          <div className="mt-4 border-t border-emerald-100 pt-4">
            <p className="text-sm text-zinc-600">{t("receiptHint")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={receiptBusy}
                onClick={() => void beginReceiptAction("download")}
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
              >
                {downloadingId === "subscription"
                  ? t("downloadingReceipt")
                  : t("downloadReceipt")}
              </button>
              <button
                type="button"
                disabled={receiptBusy}
                onClick={() => void beginReceiptAction("print")}
                className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
              >
                {printingId === "subscription"
                  ? t("printingReceipt")
                  : t("printReceipt")}
              </button>
            </div>
          </div>
        </BiodataSectionShell>
      ) : null}

      {account && account.payments.length > 0 ? (
        <BiodataSectionShell title={t("paymentsTitle")} theme="rose">
          <ul className="space-y-3">
            {account.payments.map((payment) => {
              const serviceCode =
                payment.serviceCode ??
                getMembershipServicePackage(payment.plan)?.code ??
                null;
              return (
              <li
                key={payment.id}
                className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-rose-800 to-rose-700 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {planLabel(payment.plan, tariffs, locale)}
                    </p>
                    <p className="text-xs text-rose-100">
                      {formatDate(locale, payment.validatedAt ?? payment.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-white">
                    {t("amountValue", {
                      amount: formatTariffPriceBdt(payment.amountBdt),
                      currency: payment.currency,
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500">
                      {t("transactionId")}:{" "}
                      <span className="font-mono text-zinc-700">{payment.tranId}</span>
                    </p>
                    {serviceCode ? (
                      <p className="text-xs text-zinc-500">
                        {t("serviceCode")}:{" "}
                        <span className="font-mono text-zinc-700">{serviceCode}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={downloadingId === payment.id}
                      onClick={() => void beginReceiptAction("download", payment)}
                      className="rounded-lg bg-rose-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-950 disabled:opacity-60"
                    >
                      {downloadingId === payment.id
                        ? t("downloadingReceipt")
                        : t("downloadReceipt")}
                    </button>
                    <button
                      type="button"
                      disabled={printingId === payment.id}
                      onClick={() => void beginReceiptAction("print", payment)}
                      className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {printingId === payment.id
                        ? t("printingReceipt")
                        : t("printReceipt")}
                    </button>
                  </div>
                </div>
              </li>
            );
            })}
          </ul>
        </BiodataSectionShell>
      ) : subscription && subscription.plan !== "free" ? (
        <p className="text-sm text-zinc-500">{t("noPaymentsOnFile")}</p>
      ) : null}

      {receiptData ? (
        <div className="pointer-events-none fixed left-[-10000px] top-0 w-[210mm] opacity-0">
          <MembershipReceiptDocument
            ref={receiptRef}
            receipt={receiptData}
            planLabel={receiptPlanLabel}
          />
        </div>
      ) : null}
    </div>
  );
}
