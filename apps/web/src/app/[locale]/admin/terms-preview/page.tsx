"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { TermsDocument } from "@/components/TermsDocument";
import { AUTH_TOKEN_KEY, getMe } from "@/lib/api";
import { isSuperAdminRole } from "@/lib/admin";
import {
  getAdminTermsPreview,
  type TermsPreview,
} from "@/lib/admin-legal";
import type { PublishedTerms } from "@/content/terms-content";

export default function AdminTermsPreviewPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.legal");
  const tc = useTranslations("common");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<PublishedTerms | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    getMe(token)
      .then(async (user) => {
        if (!isSuperAdminRole(user.role)) {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        const data: TermsPreview = await getAdminTermsPreview(token, locale);
        setPreview({
          version: data.version,
          effectiveDate: data.effectiveDate,
          sections: data.sections,
          publishedAt: data.publishedAt,
          isDraftPreview: true,
        });
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load preview"),
      )
      .finally(() => setLoading(false));
  }, [locale, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-700">
        {tc("loading")}
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold text-zinc-900">{t("previewDenied")}</p>
        <Link href="/admin" className="text-sm font-medium text-rose-700 hover:underline">
          {t("backToAdmin")}
        </Link>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-red-700">{error ?? t("previewLoadFailed")}</p>
        <Link href="/admin" className="text-sm font-medium text-rose-700 hover:underline">
          {t("backToAdmin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="no-print space-y-3">
          <Link href="/admin" className="text-sm font-medium text-rose-700 hover:underline">
            {t("backToAdmin")}
          </Link>
          <h1 className="text-xl font-bold text-zinc-900">{t("previewTitle")}</h1>
          <p className="text-sm text-zinc-700">{t("previewHint")}</p>
        </div>

        <TermsDocument terms={preview} scrollable={false} showVersion />
      </div>
    </div>
  );
}
