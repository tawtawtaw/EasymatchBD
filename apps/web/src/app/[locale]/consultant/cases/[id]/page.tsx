"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ConsultantCaseDetailPanel } from "@/components/ConsultantCaseDetailPanel";

export default function ConsultantCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("common");
  const [caseId, setCaseId] = useState<string | null>(null);

  useEffect(() => {
    void params.then((value) => setCaseId(value.id));
  }, [params]);

  if (!caseId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{t("loading")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <ConsultantCaseDetailPanel caseId={caseId} />
    </main>
  );
}
