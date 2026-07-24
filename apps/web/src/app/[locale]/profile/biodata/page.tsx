"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { BiodataPdfDocument } from "@/components/BiodataPdfDocument";
import { PaidMembershipRequired } from "@/components/PaidMembershipRequired";
import { AUTH_TOKEN_KEY, getBiodataBootstrap, type DropdownMap } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMounted } from "@/hooks/use-mounted";
import { membershipFromSession } from "@/lib/membership";
import { downloadBiodataPdf } from "@/lib/download-biodata-pdf";
import {
  fetchBiodataExport,
  type BiodataExportPayload,
} from "@/lib/profile-biodata-export";

const PRIVACY_LEVELS = [0, 1, 2, 3] as const;

function dropdownsCacheKey(locale: string) {
  return `easymatch_biodata_dropdowns_${locale}`;
}

export default function ProfileBiodataExportPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("biodataExport");
  const tpriv = useTranslations("privacy");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const { user: session, ready: sessionReady } = useAuthSession();
  const isPaid = membershipFromSession(session);
  const pdfRef = useRef<HTMLElement>(null);
  const [level, setLevel] = useState<number>(0);
  const [data, setData] = useState<BiodataExportPayload | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readyRef = useRef(false);
  const lastLoadedLevelRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function bootstrap() {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        router.replace("/auth");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const cachedDropdowns = sessionStorage.getItem(dropdownsCacheKey(locale));
        if (cachedDropdowns) {
          setDropdowns(JSON.parse(cachedDropdowns) as DropdownMap);
        }

        const bootstrapData = await getBiodataBootstrap(token, 0, locale);
        if (cancelled) return;

        if (!bootstrapData.termsAccepted) {
          router.replace("/profile");
          return;
        }

        readyRef.current = true;
        lastLoadedLevelRef.current = 0;
        setData(bootstrapData.export);
        if (bootstrapData.dropdowns) {
          setDropdowns(bootstrapData.dropdowns);
          sessionStorage.setItem(
            dropdownsCacheKey(locale),
            JSON.stringify(bootstrapData.dropdowns),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("actions.error"));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void import("html2pdf.js");
    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [mounted, locale, router]);

  useEffect(() => {
    if (!mounted || !readyRef.current) return;
    if (lastLoadedLevelRef.current === level) return;

    let cancelled = false;

    async function loadLevel() {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const exportData = await fetchBiodataExport(token, level);
        if (cancelled) return;
        lastLoadedLevelRef.current = level;
        setData(exportData);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("actions.error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLevel();

    return () => {
      cancelled = true;
    };
  }, [mounted, level, t]);

  async function handleDownload() {
    if (!pdfRef.current || !data) return;

    setDownloading(true);
    setError(null);
    try {
      await downloadBiodataPdf(
        pdfRef.current,
        `easymatch-biodata-${data.profileCode}-L${data.privacyLevel}.pdf`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("actions.downloadFailed"),
      );
    } finally {
      setDownloading(false);
    }
  }

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (!authToken) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{t("signInRequired")}</p>
      </main>
    );
  }

  if (sessionReady && !isPaid) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/profile"
          className="text-sm font-medium text-rose-800 hover:text-rose-900"
        >
          {t("backToProfile")}
        </Link>
        <div className="mt-6">
          <PaidMembershipRequired feature="biodata" />
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-4">
          <Link
            href="/profile"
            className="text-sm font-medium text-rose-800 hover:text-rose-900"
          >
            {t("backToProfile")}
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{t("title")}</h1>
            <p className="mt-2 text-sm text-zinc-600">{t("subtitle")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRIVACY_LEVELS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setLevel(value)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  level === value
                    ? "bg-rose-800 text-white"
                    : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {t("levelButton", {
                  level: value,
                  label: tpriv(String(value)),
                })}
              </button>
            ))}
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          {data && data.hiddenFieldCount > 0 ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("hiddenFields", { count: data.hiddenFieldCount })}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={!data || downloading}
              className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
            >
              {downloading ? t("generatingPdf") : t("downloadPdf")}
            </button>
            <p className="text-xs text-zinc-500">{t("downloadHint")}</p>
          </div>
        </div>

        {data ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-lg sm:p-8">
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("previewLabel")}
            </p>
            <BiodataPdfDocument
              ref={pdfRef}
              data={data}
              token={authToken}
              dropdowns={dropdowns}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
