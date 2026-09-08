import { setRequestLocale } from "next-intl/server";
import { AppDownloadPromo } from "@/components/AppDownloadPromo";
import { Link } from "@/i18n/routing";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import {
  buildDownloadPageUrl,
  getPublicAndroidAppRelease,
  originFromRequestHeaders,
} from "@/lib/app-release";
import { toQrDataUrl } from "@/lib/app-release-qr";

export const dynamic = "force-dynamic";

export default async function DownloadAppPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("appDownload");
  const headerList = await headers();
  const release = await getPublicAndroidAppRelease();
  const pageUrl = buildDownloadPageUrl(originFromRequestHeaders(headerList), locale);
  const qrDataUrl = await toQrDataUrl(pageUrl);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm font-medium text-rose-800 hover:underline">
        {t("backHome")}
      </Link>
      <div className="mt-8">
        <AppDownloadPromo
          variant="page"
          initialRelease={release}
          initialQrDataUrl={qrDataUrl}
        />
      </div>
    </div>
  );
}
