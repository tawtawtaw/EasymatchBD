import {
  buildComparisonDirection,
  type ComparisonPartnerPreference,
  type ComparisonProfileAttributes,
} from './comparison-matrix';

export type PartnerPreferenceInput = ComparisonPartnerPreference;

export type CompatibilityCandidate = ComparisonProfileAttributes;

export type CompatibilityResult = {
  score: number;
  matchedCount: number;
  totalCriteria: number;
};

export { ageFromDateOfBirth } from './comparison-matrix';

export function calculateCompatibility(
  preferences: PartnerPreferenceInput | null | undefined,
  candidate: CompatibilityCandidate,
  options?: {
    viewerGender?: string | null;
    viewerReligion?: string | null;
    attributeVisibility?: Partial<
      Record<
        | 'age'
        | 'height'
        | 'weight'
        | 'district'
        | 'education'
        | 'profession'
        | 'marital_status'
        | 'religion'
        | 'beard'
        | 'prayer'
        | 'hijab',
        boolean
      >
    >;
  },
): CompatibilityResult {
  const direction = buildComparisonDirection({
    preferences,
    attributes: candidate,
    attributeVisibility: options?.attributeVisibility,
    viewerGender: options?.viewerGender,
    viewerReligion: options?.viewerReligion,
  });

  return {
    score: direction.score,
    matchedCount: direction.matchedCount,
    totalCriteria: direction.totalCriteria,
  };
}
