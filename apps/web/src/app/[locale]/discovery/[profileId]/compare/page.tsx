"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { ComparisonMatrix } from "@/components/ComparisonMatrix";
import { MaritalAlignmentMatrix } from "@/components/MaritalAlignmentMatrix";
import { ComparisonInterestFooter } from "@/components/ComparisonInterestFooter";
import { AUTH_TOKEN_KEY, DropdownMap, getDropdowns } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMounted } from "@/hooks/use-mounted";
import { membershipFromSession } from "@/lib/membership";
import { getProfileComparison, type ProfileComparison } from "@/lib/comparison";

export default function ProfileComparePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("comparison");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const { user: session, ready: sessionReady } = useAuthSession();
  const isPaid = membershipFromSession(session);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ProfileComparison | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [tab, setTab] = useState<"viewerToOther" | "otherToViewer">(
    "viewerToOther",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then((value) => setProfileId(value.profileId));
  }, [params]);

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !profileId) return;

    setLoading(true);
    setError(null);
    try {
      if (sessionReady && session && !session.termsAccepted) {
        router.replace("/profile");
        return;
      }

      const [dd, data] = await Promise.all([
        getDropdowns(locale),
        getProfileComparison(token, profileId),
      ]);
      setDropdowns(dd);
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }, [locale, profileId, router, session, sessionReady, t]);

  useEffect(() => {
    if (!mounted || !profileId || !sessionReady) return;
    void load();
  }, [mounted, profileId, sessionReady, load]);

  if (!mounted || !profileId || loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (!authToken || !comparison) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{error ?? t("signInRequired")}</p>
      </main>
    );
  }

  const viewerName = comparison.viewer.fullName ?? t("you");
  const otherName =
    comparison.other.fullName ??
    t("profileRef", { code: comparison.other.profileCode });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link
          href={`/discovery/${comparison.other.profileCode}`}
          className="text-sm font-medium text-rose-800 hover:underline"
        >
          {t("backToProfile")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="mt-2 text-zinc-600">
          {t("subtitle", { you: viewerName, other: otherName })}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-md">
          <div className="bg-gradient-to-r from-rose-800 to-rose-700 px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-100">
              {t("mutualScore")}
            </p>
          </div>
          <p className="px-4 py-4 text-3xl font-bold text-rose-900">
            {comparison.mutualScore}%
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-md">
          <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-100">
              {t("youExpectFromThem")}
            </p>
          </div>
          <p className="px-4 py-4 text-3xl font-bold text-emerald-900">
            {comparison.viewerToOther.score}%
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-sky-200 bg-white shadow-md">
          <div className="bg-gradient-to-r from-sky-800 to-sky-700 px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-100">
              {t("theyExpectFromYou")}
            </p>
          </div>
          <p className="px-4 py-4 text-3xl font-bold text-sky-900">
            {comparison.otherPreferencesVisible
              ? `${comparison.otherToViewer.score}%`
              : t("hiddenShort")}
          </p>
        </div>
      </section>

      {!comparison.otherPreferencesVisible ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("otherPreferencesHiddenHint")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("viewerToOther")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            tab === "viewerToOther"
              ? "bg-rose-800 text-white"
              : "border border-zinc-300 text-zinc-800 hover:bg-zinc-50"
          }`}
        >
          {t("tabViewerToOther", { other: otherName })}
        </button>
        <button
          type="button"
          onClick={() => setTab("otherToViewer")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            tab === "otherToViewer"
              ? "bg-rose-800 text-white"
              : "border border-zinc-300 text-zinc-800 hover:bg-zinc-50"
          }`}
        >
          {t("tabOtherToViewer", { other: otherName })}
        </button>
      </div>

      <ComparisonMatrix
        direction={
          tab === "viewerToOther"
            ? comparison.viewerToOther
            : comparison.otherToViewer
        }
        mode={tab}
        dropdowns={dropdowns}
        locale={locale}
      />

      <MaritalAlignmentMatrix
        alignment={comparison.maritalAlignment}
        dropdowns={dropdowns}
        locale={locale}
        otherName={otherName}
      />

      <ComparisonInterestFooter
        profileCode={comparison.other.profileCode}
        otherName={otherName}
        mutualScore={comparison.mutualScore}
        relationship={comparison.relationship}
        isPaid={isPaid}
        sessionReady={sessionReady}
        onUpdated={load}
      />
    </main>
  );
}
