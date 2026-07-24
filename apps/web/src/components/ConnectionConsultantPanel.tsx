"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useCallback, useEffect, useState } from "react";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { getConsultantTariffs, type ConsultantTariff } from "@/lib/consultant-tariffs";
import {
  listConnectionConsultantEngagements,
  startConsultantCheckout,
  type ConsultantEngagementItem,
} from "@/lib/consultant-engagements";
import type { ConsultantServiceType } from "@easymatch/shared";
import { formatTariffPriceBdt } from "@easymatch/shared";

type ConnectionConsultantPanelProps = {
  connectionId: string;
  authToken: string;
};

function statusClass(status: string) {
  switch (status) {
    case "queued":
      return "bg-amber-100 text-amber-900";
    case "assigned":
    case "in_progress":
      return "bg-blue-100 text-blue-900";
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-zinc-200 text-zinc-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export function ConnectionConsultantPanel({
  connectionId,
  authToken,
}: ConnectionConsultantPanelProps) {
  const locale = useLocale();
  const t = useTranslations("consultant");
  const tc = useTranslations("common");
  const [tariffs, setTariffs] = useState<ConsultantTariff[]>([]);
  const [engagements, setEngagements] = useState<ConsultantEngagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tariffList, engagementList] = await Promise.all([
        getConsultantTariffs(),
        listConnectionConsultantEngagements(authToken, connectionId),
      ]);
      setTariffs(tariffList);
      setEngagements(engagementList);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [authToken, connectionId, t]);

  useEffect(() => {
    if (!expanded) return;
    void load();
  }, [expanded, load]);

  function tariffLabel(tariff: ConsultantTariff) {
    return locale === "bn" && tariff.labelBn?.trim()
      ? tariff.labelBn
      : tariff.labelEn;
  }

  function tariffDescription(tariff: ConsultantTariff) {
    return locale === "bn" && tariff.descriptionBn?.trim()
      ? tariff.descriptionBn
      : tariff.descriptionEn;
  }

  async function handleRequest(serviceType: ConsultantServiceType) {
    setActing(serviceType);
    setError(null);
    try {
      const checkout = await startConsultantCheckout(authToken, {
        connectionId,
        serviceType,
        memberNotes: notes.trim() || undefined,
      });
      window.location.href = checkout.gatewayUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutError"));
      setActing(null);
    }
  }

  const activeServiceTypes = new Set(
    engagements
      .filter((e) => !["completed", "cancelled"].includes(e.status))
      .map((e) => e.serviceType),
  );

  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div>
          <h3 className="text-sm font-bold text-violet-950">{t("panelTitle")}</h3>
          <p className="mt-0.5 text-xs text-violet-800">{t("panelHint")}</p>
        </div>
        <span className="text-xs font-semibold text-violet-900">
          {expanded ? t("collapse") : t("expand")}
        </span>
      </button>

      {expanded ? (
        <div className="mt-4 space-y-4">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="text-xs text-violet-900">{tc("loading")}</p>
          ) : (
            <>
              <label className="block text-xs">
                <span className="font-medium text-violet-950">{t("notesLabel")}</span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <div className="space-y-2">
                {tariffs.map((tariff) => {
                  const busy = activeServiceTypes.has(tariff.serviceType);
                  return (
                    <article
                      key={tariff.serviceType}
                      className="rounded-lg border border-violet-200 bg-white p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-zinc-900">
                            {tariffLabel(tariff)}
                          </p>
                          {tariffDescription(tariff) ? (
                            <p className="mt-1 text-xs text-zinc-600">
                              {tariffDescription(tariff)}
                            </p>
                          ) : null}
                        </div>
                        <p className="text-sm font-bold text-violet-900">
                          ৳{formatTariffPriceBdt(tariff.priceBdt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy || acting === tariff.serviceType}
                        onClick={() => void handleRequest(tariff.serviceType)}
                        className="mt-3 rounded-lg bg-violet-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                      >
                        {busy
                          ? t("alreadyRequested")
                          : acting === tariff.serviceType
                            ? t("redirecting")
                            : t("requestService")}
                      </button>
                    </article>
                  );
                })}
              </div>

              {engagements.length > 0 ? (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-violet-900">
                    {t("yourRequests")}
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {engagements.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-violet-100 bg-white px-3 py-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-zinc-900">
                            {t(`services.${item.serviceType}` as "services.profile_assessment")}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${statusClass(item.status)}`}
                          >
                            {t(`status.${item.status}` as "status.queued")}
                          </span>
                        </div>
                        <p className="mt-1 text-zinc-500">
                          {t("requestedAt", {
                            date: new Date(item.createdAt).toLocaleString(),
                          })}
                        </p>
                        {item.status !== "cancelled" && item.status !== "completed" ? (
                          <Link
                            href={`/consultant/cases/${item.id}`}
                            className="mt-2 inline-flex text-xs font-semibold text-violet-900 hover:underline"
                          >
                            {t("openCase")} →
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
