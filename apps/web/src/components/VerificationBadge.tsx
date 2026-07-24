"use client";

import { useTranslations } from "next-intl";

type VerificationBadgeProps = {
  isVerified: boolean;
  verifiedOnBehalf?: boolean;
  memberNidVerified?: boolean;
  className?: string;
};

export function VerificationBadge({
  isVerified,
  verifiedOnBehalf = false,
  memberNidVerified = false,
  className = "",
}: VerificationBadgeProps) {
  const t = useTranslations("discovery");

  if (!isVerified) return null;

  if (verifiedOnBehalf && memberNidVerified) {
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900 ${className}`}
      >
        {t("verifiedOnBehalfDualNid")}
      </span>
    );
  }

  if (verifiedOnBehalf) {
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 ${className}`}
      >
        {t("verifiedOnBehalf")}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 ${className}`}
    >
      {t("verified")}
    </span>
  );
}
