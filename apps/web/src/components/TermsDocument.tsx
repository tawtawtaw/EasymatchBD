"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { TermsSection, TermsSubsection } from "@/content/terms-content";
import { fetchPublishedTermsClient, type PublishedTerms } from "@/lib/legal";

function TermsBlock({ section }: { section: TermsSection | TermsSubsection }) {
  return (
    <div className="space-y-2">
      {"title" in section && section.title && (
        <h3 className="text-sm font-bold text-zinc-950">{section.title}</h3>
      )}
      {section.intro && <p className="text-sm text-zinc-800">{section.intro}</p>}
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="text-sm text-zinc-800">
          {paragraph}
        </p>
      ))}
      {section.bullets && section.bullets.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-800">
          {section.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {"subsections" in section &&
        section.subsections?.map((subsection) => (
          <div
            key={subsection.title}
            className="ml-2 space-y-2 border-l-2 border-rose-200 pl-4"
          >
            <TermsBlock section={subsection} />
          </div>
        ))}
    </div>
  );
}

type TermsDocumentProps = {
  scrollable?: boolean;
  showVersion?: boolean;
  terms?: PublishedTerms | null;
};

export function TermsDocument({
  scrollable = false,
  showVersion = true,
  terms: termsProp,
}: TermsDocumentProps) {
  const locale = useLocale();
  const t = useTranslations("terms");
  const tc = useTranslations("common");
  const [terms, setTerms] = useState<PublishedTerms | null>(termsProp ?? null);
  const [loading, setLoading] = useState(termsProp === undefined);

  useEffect(() => {
    if (termsProp !== undefined) {
      setTerms(termsProp);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPublishedTermsClient(locale)
      .then(setTerms)
      .finally(() => setLoading(false));
  }, [locale, termsProp]);

  if (loading) {
    return (
      <p className="text-sm text-zinc-600">{tc("loading")}</p>
    );
  }

  if (!terms) return null;

  const body = (
    <div className="space-y-6">
      {terms.sections.map((section) => (
        <section key={section.id} className="space-y-2">
          {section.id === "intro" ? (
            <>
              <h2 className="text-lg font-bold text-zinc-950">{t("brand")}</h2>
              <TermsBlock section={section} />
            </>
          ) : (
            <TermsBlock section={section} />
          )}
        </section>
      ))}
    </div>
  );

  return (
    <>
      {terms.isDraftPreview && (
        <p className="no-print rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-950">
          {t("draftPreviewBanner")}
        </p>
      )}

      <div className="terms-print-header space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900">{t("pageTitle")}</h1>
        <p className="text-sm text-zinc-600">
          {t("effectiveDate", { date: terms.effectiveDate })}
        </p>
      </div>

      {scrollable ? (
        <div className="max-h-[min(55vh,32rem)] overflow-y-auto rounded-2xl border border-zinc-300 bg-white p-6 shadow-md">
          {body}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md">
          {body}
        </div>
      )}

      {showVersion && (
        <p className="text-center text-xs text-zinc-500">
          {tc("brand")} · {t("version", { version: terms.version })}
        </p>
      )}
    </>
  );
}
