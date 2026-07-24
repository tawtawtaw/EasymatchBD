"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { TermsDocument } from "@/components/TermsDocument";

export default function TermsPage() {
  const t = useTranslations("terms");

  function handleDownloadPdf() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="no-print">
          <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
            {t("backHome")}
          </Link>
          <p className="mt-3 text-sm text-zinc-800">{t("standaloneHint")}</p>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="mt-4 inline-flex rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50"
          >
            {t("downloadPdf")}
          </button>
        </div>

        <TermsDocument scrollable={false} showVersion />
      </div>
    </div>
  );
}
