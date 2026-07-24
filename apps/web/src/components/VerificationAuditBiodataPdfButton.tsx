"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BiodataPdfDocument } from "@/components/BiodataPdfDocument";
import type { DropdownMap } from "@/lib/api";
import { downloadBiodataPdf } from "@/lib/download-biodata-pdf";
import type { BiodataExportPayload } from "@/lib/profile-biodata-export";
import {
  fetchVerificationAuditBiodata,
  fetchVerificationBlob,
  officerPhotoUrl,
} from "@/lib/verification";

type VerificationAuditBiodataPdfButtonProps = {
  profileId: string;
  profileCode: string;
  authToken: string;
  dropdowns: DropdownMap;
};

async function waitForPdfRender() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function VerificationAuditBiodataPdfButton({
  profileId,
  profileCode,
  authToken,
  dropdowns,
}: VerificationAuditBiodataPdfButtonProps) {
  const t = useTranslations("verification");
  const pdfRef = useRef<HTMLElement>(null);
  const [exportData, setExportData] = useState<BiodataExportPayload | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchVerificationAuditBiodata(authToken, profileId);
      setExportData(data);
      await waitForPdfRender();
      if (!pdfRef.current) {
        throw new Error(t("auditPdf.failed"));
      }
      await downloadBiodataPdf(
        pdfRef.current,
        `easymatch-audit-${profileCode}-L3.pdf`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auditPdf.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleDownload()}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
      >
        {busy ? t("auditPdf.generating") : t("auditPdf.download")}
      </button>
      <p className="text-xs text-zinc-500">{t("auditPdf.hint")}</p>
      {error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : null}
      {exportData ? (
        <div className="pointer-events-none fixed left-[-10000px] top-0 w-[210mm] opacity-0">
          <BiodataPdfDocument
            ref={pdfRef}
            data={exportData}
            token={authToken}
            dropdowns={dropdowns}
            photoPath={(photoId) => officerPhotoUrl(profileId, photoId)}
            fetchBlob={fetchVerificationBlob}
          />
        </div>
      ) : null}
    </div>
  );
}
