"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { DiscoveryFieldSection } from "@/components/DiscoveryFieldSection";
import { VerificationBadge } from "@/components/VerificationBadge";
import { DropdownMap, getDropdowns } from "@/lib/api";
import { useMounted } from "@/hooks/use-mounted";
import {
  displayPublicName,
  getPublicProfile,
  type PublicBrowseProfile,
} from "@/lib/public-browse";

export default function PublicBrowseProfilePage() {
  const params = useParams<{ profileCode: string }>();
  const profileCode = params.profileCode;
  const locale = useLocale();
  const t = useTranslations("publicBrowse");
  const mounted = useMounted();
  const [profile, setProfile] = useState<PublicBrowseProfile | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, dd] = await Promise.all([
        getPublicProfile(profileCode),
        getDropdowns(locale),
      ]);
      setProfile(data);
      setDropdowns(dd);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [profileCode, locale, t]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{t("loading")}</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/browse" className="text-sm font-medium text-rose-800">
          {t("backToBrowse")}
        </Link>
        <p className="mt-4 text-zinc-600">{error ?? t("notFound")}</p>
      </main>
    );
  }

  const name = displayPublicName(profile.personal);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/browse" className="text-sm font-medium text-rose-800">
        {t("backToBrowse")}
      </Link>

      <header className="mt-4 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {name ?? t("anonymousMember")}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {t("profileCode", { code: profile.profileCode })}
            </p>
          </div>
          <VerificationBadge
            isVerified={profile.media.isVerified}
            verifiedOnBehalf={profile.media.verifiedOnBehalf}
            memberNidVerified={profile.media.memberNidVerified}
          />
        </div>
        <p className="mt-3 text-sm text-amber-900">{t("detailPrivacyNote")}</p>
      </header>

      <div className="mt-6 space-y-5">
        <DiscoveryFieldSection
          title={t("sections.personal")}
          kind="personal"
          data={profile.personal}
          dropdowns={dropdowns}
        />
        {profile.family ? (
          <DiscoveryFieldSection
            title={t("sections.family")}
            kind="family"
            data={profile.family}
            dropdowns={dropdowns}
            personal={profile.personal}
          />
        ) : null}
        {profile.marital ? (
          <DiscoveryFieldSection
            title={t("sections.marital")}
            kind="marital"
            data={profile.marital}
            dropdowns={dropdowns}
            personal={profile.personal}
          />
        ) : null}
        {profile.siblings?.length ? (
          <DiscoveryFieldSection
            title={t("sections.siblings")}
            kind="siblings"
            data={profile.siblings}
            dropdowns={dropdowns}
            personal={profile.personal}
          />
        ) : null}
        {profile.paternalRelatives?.length ? (
          <DiscoveryFieldSection
            title={t("sections.paternal")}
            kind="paternal_relatives"
            data={profile.paternalRelatives}
            dropdowns={dropdowns}
            personal={profile.personal}
          />
        ) : null}
        {profile.maternalRelatives?.length ? (
          <DiscoveryFieldSection
            title={t("sections.maternal")}
            kind="maternal_relatives"
            data={profile.maternalRelatives}
            dropdowns={dropdowns}
            personal={profile.personal}
          />
        ) : null}
      </div>

      {profile.hiddenFieldCount > 0 ? (
        <p className="mt-6 rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
          {t("hiddenFields", { count: profile.hiddenFieldCount })}
        </p>
      ) : null}

      <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6">
        <h2 className="text-lg font-bold text-rose-950">{t("interestTitle")}</h2>
        <p className="mt-2 text-sm text-rose-900">{t("interestBody")}</p>
        <Link
          href="/auth"
          className="mt-4 inline-flex rounded-full bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </main>
  );
}
