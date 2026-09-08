"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { AppDownloadQr } from "@/components/AppDownloadQr";
import {
  androidApkHref,
  getPublicAndroidAppRelease,
} from "@/lib/app-release";
import type { PublicAndroidAppRelease } from "@easymatch/shared";

function QrBlock({
  dataUrl,
  label,
  hint,
  tone,
}: {
  dataUrl: string;
  label: string;
  hint: string;
  tone: "hero" | "page";
}) {
  return (
    <div
      className={
        tone === "hero"
          ? "hidden rounded-2xl bg-white/15 p-3 lg:block"
          : "hidden rounded-2xl border border-rose-100 bg-rose-50 p-4 lg:block"
      }
    >
      <AppDownloadQr dataUrl={dataUrl} label={label} />
      <p
        className={
          tone === "hero"
            ? "mt-2 max-w-[220px] text-center text-xs text-rose-50"
            : "mt-3 max-w-[220px] text-center text-sm text-zinc-600"
        }
      >
        {hint}
      </p>
    </div>
  );
}

export function AppDownloadPromo({
  variant,
  initialRelease,
  initialQrDataUrl,
}: {
  variant: "hero" | "page";
  initialRelease?: PublicAndroidAppRelease;
  initialQrDataUrl?: string | null;
}) {
  const t = useTranslations("appDownload");
  const [release, setRelease] = useState<PublicAndroidAppRelease | null>(
    initialRelease ?? null,
  );
  const [qrDataUrl] = useState(initialQrDataUrl ?? "");

  useEffect(() => {
    void getPublicAndroidAppRelease().then((next) => {
      setRelease((prev) => (next.available || !prev?.available ? next : prev));
    });
  }, []);

  const available = Boolean(release?.available);
  const apkHref = androidApkHref();
  const qr =
    available && qrDataUrl ? (
      <QrBlock
        dataUrl={qrDataUrl}
        label={t("qrLabel")}
        hint={t("qrHint")}
        tone={variant === "hero" ? "hero" : "page"}
      />
    ) : null;

  if (variant === "hero") {
    return (
      <div className="flex flex-wrap items-start gap-6">
        <Link
          href="/download"
          className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 lg:hidden"
        >
          {t("getTheApp")}
        </Link>
        {qr}
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="max-w-xl text-zinc-600 lg:hidden">{t("subtitleMobile")}</p>
        <p className="hidden max-w-xl text-zinc-600 lg:block">{t("subtitleDesktop")}</p>
        {available ? (
          <div className="space-y-4 lg:hidden">
            <p className="text-sm font-medium text-zinc-800">
              {t("version", {
                name: release?.versionName ?? "",
                code: String(release?.versionCode ?? ""),
              })}
            </p>
            <a
              href={apkHref}
              className="inline-flex rounded-full bg-rose-800 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-900"
            >
              {t("downloadApk")}
            </a>
            <p className="max-w-xl text-sm text-zinc-500">{t("installHint")}</p>
          </div>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("unavailable")}
          </p>
        )}
      </div>
      {qr}
    </div>
  );
}
