import {
  getDefaultTermsEffectiveDate,
  getDefaultTermsSections,
  DEFAULT_TERMS_VERSION,
  type TermsSection,
} from "@easymatch/shared";

export type { TermsSection, TermsSubsection } from "@easymatch/shared";

export type PublishedTerms = {
  version: string;
  effectiveDate: string;
  sections: TermsSection[];
  publishedAt?: string;
  isDraftPreview?: boolean;
};

export function getFallbackTerms(locale: string): PublishedTerms {
  return {
    version: DEFAULT_TERMS_VERSION,
    effectiveDate: getDefaultTermsEffectiveDate(locale),
    sections: getDefaultTermsSections(locale),
  };
}
