"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/routing";
import { TermsDocument } from "@/components/TermsDocument";
import { acceptTerms, declineTerms } from "@/lib/api";

type TermsAcceptanceGateProps = {
  onAccepted: () => void;
  onDeclined: () => void;
  currentTermsVersion: string;
  previousTermsVersion?: string | null;
};

export function TermsAcceptanceGate({
  onAccepted,
  onDeclined,
  currentTermsVersion,
  previousTermsVersion,
}: TermsAcceptanceGateProps) {
  const t = useTranslations("terms");
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsReaccept =
    Boolean(previousTermsVersion) &&
    previousTermsVersion !== currentTermsVersion;

  async function handleAccept() {
    setLoading("accept");
    setError(null);
    try {
      await acceptTerms(currentTermsVersion);
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept terms");
    } finally {
      setLoading(null);
    }
  }

  async function handleDecline() {
    setLoading("decline");
    setError(null);
    try {
      await declineTerms();
      onDeclined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record decline");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
            {t("backHome")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">{t("pageTitle")}</h1>
          <p className="mt-3 text-sm text-zinc-800">{t("profileGateHint")}</p>
          <p className="mt-2 text-sm">
            <Link href="/terms" className="font-medium text-rose-700 hover:underline">
              {t("viewFullTerms")}
            </Link>
          </p>
        </div>

        {needsReaccept && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {t("updatedNotice", {
              previous: previousTermsVersion ?? "",
              current: currentTermsVersion,
            })}
          </p>
        )}

        <TermsDocument scrollable showVersion={false} />

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="space-y-4 rounded-2xl border border-zinc-300 bg-white p-6 shadow-md">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={readConfirmed}
              onChange={(e) => setReadConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 accent-rose-700"
            />
            <span className="text-sm font-medium text-zinc-900">
              {t("readConfirm")}
            </span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={!readConfirmed || loading !== null}
              onClick={handleAccept}
              className="rounded-lg bg-rose-700 px-6 py-3 font-semibold text-white shadow-sm hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "accept" ? t("accepting") : t("agree")}
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={handleDecline}
              className="rounded-lg border border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {loading === "decline" ? t("declining") : t("decline")}
            </button>
          </div>

          <p className="text-xs text-zinc-600">{t("declineNote")}</p>
        </div>

        <p className="text-center text-xs text-zinc-500">
          {t("version", { version: currentTermsVersion })}
        </p>
      </div>
    </div>
  );
}
