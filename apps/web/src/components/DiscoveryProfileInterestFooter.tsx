"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { PaidMembershipRequired } from "@/components/PaidMembershipRequired";
import type { DiscoveryRelationship } from "@/lib/discovery";

type DiscoveryProfileInterestFooterProps = {
  isSelf: boolean;
  isPaid: boolean;
  sessionReady: boolean;
  rel: DiscoveryRelationship;
  acting: boolean;
  onSendInterest: () => void;
};

export function DiscoveryProfileInterestFooter({
  isSelf,
  isPaid,
  sessionReady,
  rel,
  acting,
  onSendInterest,
}: DiscoveryProfileInterestFooterProps) {
  const t = useTranslations("discovery");

  if (isSelf) {
    return null;
  }

  if (
    rel.status !== "none" &&
    rel.status !== "interest_sent" &&
    rel.status !== "connected"
  ) {
    return null;
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {!isPaid && sessionReady && rel.status === "none" ? (
          <PaidMembershipRequired feature="interest" compact />
        ) : null}
        {isPaid && rel.status === "none" ? (
          <button
            type="button"
            disabled={acting}
            onClick={onSendInterest}
            className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
          >
            {t("expressInterest")}
          </button>
        ) : null}
        {rel.status === "interest_sent" ? (
          <span className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
            {t("interestSent")}
          </span>
        ) : null}
        {isPaid && rel.status === "connected" ? (
          <>
            <span className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-900">
              {t("connected")}
            </span>
            {rel.connectionId ? (
              <Link
                href={`/messages/${rel.connectionId}`}
                className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
              >
                {t("message")}
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
