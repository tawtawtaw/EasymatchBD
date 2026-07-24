export type TermsSubsection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type TermsSection = {
  id: string;
  title: string;
  intro?: string;
  paragraphs?: string[];
  bullets?: string[];
  subsections?: TermsSubsection[];
};
