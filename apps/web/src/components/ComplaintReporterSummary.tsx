"use client";

import { useTranslations } from "next-intl";
import {
  complaintReporterDisplayName,
  complaintReporterProfileCode,
  type ComplaintReporterSummary,
} from "@/lib/complaint-display";

type ComplaintReporterSummaryProps = {
  namespace: "admin.complaints" | "consultantComplaints";
  reporter: ComplaintReporterSummary;
  className?: string;
};

export function ComplaintReporterSummary({
  namespace,
  reporter,
  className = "mt-1 text-sm text-zinc-600",
}: ComplaintReporterSummaryProps) {
  const t = useTranslations(namespace);
  const profileCode = complaintReporterProfileCode(reporter);
  const displayName = complaintReporterDisplayName(reporter);

  return (
    <div className={className}>
      <p>
        {t("filedByProfile", { code: profileCode })}
      </p>
      {displayName ? (
        <p className="mt-0.5 text-xs text-zinc-500">
          {t("reporterDisplayName", { name: displayName })}
        </p>
      ) : null}
    </div>
  );
}
