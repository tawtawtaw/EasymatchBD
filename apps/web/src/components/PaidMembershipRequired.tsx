"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

type PaidMembershipRequiredProps = {
  feature?: "biodata" | "interest" | "messages" | "videoCalls" | "connect";
  compact?: boolean;
};

export function PaidMembershipRequired({
  feature = "connect",
  compact = false,
}: PaidMembershipRequiredProps) {
  const t = useTranslations("membership");

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 ${
        compact ? "p-4" : "p-6"
      }`}
    >
      <h2 className={`font-semibold text-amber-950 ${compact ? "text-base" : "text-lg"}`}>
        {t("requiredTitle")}
      </h2>
      <p className="mt-2 text-sm text-amber-900">{t(`required.${feature}`)}</p>
      <p className="mt-2 text-sm text-amber-800">{t("requiredNote")}</p>
      <Link
        href="/membership"
        className="mt-4 inline-flex rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
      >
        {t("viewPlans")}
      </Link>
    </div>
  );
}
