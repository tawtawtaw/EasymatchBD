"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useMemberAlerts } from "@/components/MemberAlertsProvider";
import type { EndedConnectionAlert } from "@/lib/member-alerts";

const DISMISS_PREFIX = "easymatch_connection_ended_alert_";

function dismissKey(alert: EndedConnectionAlert) {
  return `${DISMISS_PREFIX}${alert.connectionId}_${alert.endedAt}`;
}

function isDismissed(alert: EndedConnectionAlert) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(dismissKey(alert)) === "1";
}

function formatReconnectDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ConnectionEndedAlertsBanner() {
  const t = useTranslations("connections");
  const locale = useLocale();
  const { summary } = useMemberAlerts();
  const [dismissedVersion, setDismissedVersion] = useState(0);

  const visibleAlerts = useMemo(() => {
    void dismissedVersion;
    return (summary.endedConnectionAlerts ?? []).filter(
      (alert) => !isDismissed(alert),
    );
  }, [dismissedVersion, summary.endedConnectionAlerts]);

  const dismiss = useCallback((alert: EndedConnectionAlert) => {
    localStorage.setItem(dismissKey(alert), "1");
    setDismissedVersion((v) => v + 1);
  }, []);

  if (visibleAlerts.length === 0) return null;

  return (
    <div
      className="border-b border-amber-200 bg-amber-50"
      role="region"
      aria-label={t("endedAlertRegion")}
    >
      <div className="mx-auto max-w-5xl space-y-2 px-4 py-3 sm:px-6">
        {visibleAlerts.map((alert) => {
          const name =
            alert.member.fullName?.trim() ||
            (alert.member.profileCode
              ? t("profileRef", { code: alert.member.profileCode })
              : null);
          const date = alert.reconnectAvailableAt
            ? formatReconnectDate(alert.reconnectAvailableAt, locale)
            : null;
          const body = name
            ? date
              ? t("endedAlertBodyNamed", { name, date })
              : t("endedAlertBodyNamedReady", { name })
            : date
              ? t("endedAlertBody", { date })
              : t("endedAlertBodyReady");

          return (
            <div
              key={`${alert.connectionId}-${alert.endedAt}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  {t("endedAlertTitle")}
                </p>
                <p className="mt-1 text-sm text-amber-900">{body}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => dismiss(alert)}
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-amber-50"
                >
                  {t("endedAlertDismiss")}
                </button>
                {alert.member.profileCode ? (
                  <Link
                    href={`/discovery/${alert.member.profileCode}`}
                    className="rounded-lg bg-amber-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-900"
                  >
                    {t("endedAlertViewProfile")}
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
