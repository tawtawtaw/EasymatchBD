import {
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
} from './terms-sections-en';
import {
  TERMS_EFFECTIVE_DATE_BN,
  TERMS_SECTIONS_BN,
} from './terms-sections-bn';
import type { TermsSection } from './terms-sections.types';

export type { TermsSection, TermsSubsection } from './terms-sections.types';

export {
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
  TERMS_EFFECTIVE_DATE_BN,
  TERMS_SECTIONS_BN,
};

export function getDefaultTermsSections(locale: string): TermsSection[] {
  return locale === 'bn' ? TERMS_SECTIONS_BN : TERMS_SECTIONS;
}

export function getDefaultTermsEffectiveDate(locale: string): string {
  return locale === 'bn' ? TERMS_EFFECTIVE_DATE_BN : TERMS_EFFECTIVE_DATE;
}
