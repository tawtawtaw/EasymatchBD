import type { ComparisonStatus } from './comparison-matrix';
import {
  FEMALE_GENDER_VALUE,
  MALE_GENDER_VALUE,
} from './islam-profile-fields';
import { livingArrangementsCompatible } from './marital-information';

export type MaritalAlignmentKey =
  | 'expected_marriage_timeline'
  | 'expected_parenthood_timeline'
  | 'wedding_ceremony_preference'
  | 'expected_kabin_amount'
  | 'living_arrangements';

export type MaritalProfileSnapshot = {
  gender?: string | null;
  expectedMarriageTimeline?: string | null;
  expectedParenthoodTimeline?: string | null;
  weddingCeremonyPreference?: string | null;
  livingArrangements?: string | null;
  livingArrangementsOther?: string | null;
  expectedKabinAmountMinBdt?: number | null;
  expectedKabinAmountMaxBdt?: number | null;
};

export type MaritalAlignmentRow = {
  key: MaritalAlignmentKey;
  status: ComparisonStatus;
  viewerValue: string | null;
  otherValue: string | null;
  viewerKabinMin: number | null;
  viewerKabinMax: number | null;
  otherKabinMin: number | null;
  otherKabinMax: number | null;
  viewerLivingOther: string | null;
  otherLivingOther: string | null;
  viewerHidden: boolean;
  otherHidden: boolean;
};

export type MaritalAlignmentResult = {
  score: number;
  matchedCount: number;
  totalCriteria: number;
  viewerGender: string | null;
  otherGender: string | null;
  rows: MaritalAlignmentRow[];
};

function normalizeKabinRange(
  min: number | null | undefined,
  max: number | null | undefined,
): [number, number] | null {
  if (min == null && max == null) return null;
  const low = min ?? max!;
  const high = max ?? min!;
  return [Math.min(low, high), Math.max(low, high)];
}

function kabinRangesCompatible(
  viewerMin: number | null | undefined,
  viewerMax: number | null | undefined,
  otherMin: number | null | undefined,
  otherMax: number | null | undefined,
): boolean {
  const viewerRange = normalizeKabinRange(viewerMin, viewerMax);
  const otherRange = normalizeKabinRange(otherMin, otherMax);
  if (!viewerRange || !otherRange) return false;
  return viewerRange[0] <= otherRange[1] && otherRange[0] <= viewerRange[1];
}

function evaluateStringAlignment(
  viewerValue: string | null | undefined,
  otherValue: string | null | undefined,
  viewerHidden: boolean,
  otherHidden: boolean,
): ComparisonStatus {
  const viewer = viewerValue?.trim() || null;
  const other = otherValue?.trim() || null;

  if (!viewer && !other) return 'not_set';
  if (viewerHidden || otherHidden) return 'unknown';
  if (!viewer || !other) return 'unknown';
  return viewer === other ? 'match' : 'mismatch';
}

function evaluateKabinAlignment(
  viewer: MaritalProfileSnapshot,
  other: MaritalProfileSnapshot,
  viewerHidden: boolean,
  otherHidden: boolean,
): ComparisonStatus {
  const viewerRange = normalizeKabinRange(
    viewer.expectedKabinAmountMinBdt,
    viewer.expectedKabinAmountMaxBdt,
  );
  const otherRange = normalizeKabinRange(
    other.expectedKabinAmountMinBdt,
    other.expectedKabinAmountMaxBdt,
  );

  if (!viewerRange && !otherRange) return 'not_set';
  if (viewerHidden || otherHidden) return 'unknown';
  if (!viewerRange || !otherRange) return 'unknown';

  return kabinRangesCompatible(
    viewer.expectedKabinAmountMinBdt,
    viewer.expectedKabinAmountMaxBdt,
    other.expectedKabinAmountMinBdt,
    other.expectedKabinAmountMaxBdt,
  )
    ? 'match'
    : 'mismatch';
}

function evaluateLivingArrangementsAlignment(
  viewer: MaritalProfileSnapshot,
  other: MaritalProfileSnapshot,
  viewerHidden: boolean,
  otherHidden: boolean,
): ComparisonStatus {
  const viewerGender = viewer.gender ?? null;
  const otherGender = other.gender ?? null;
  const isMaleFemalePair =
    (viewerGender === MALE_GENDER_VALUE &&
      otherGender === FEMALE_GENDER_VALUE) ||
    (viewerGender === FEMALE_GENDER_VALUE &&
      otherGender === MALE_GENDER_VALUE);

  if (!isMaleFemalePair) return 'not_applicable';

  const maleSnapshot =
    viewerGender === MALE_GENDER_VALUE ? viewer : other;
  const femaleSnapshot =
    viewerGender === FEMALE_GENDER_VALUE ? viewer : other;
  const maleValue = maleSnapshot.livingArrangements ?? null;
  const femaleValue = femaleSnapshot.livingArrangements ?? null;

  if (!maleValue && !femaleValue) return 'not_set';
  if (viewerHidden || otherHidden) return 'unknown';
  if (!maleValue || !femaleValue) return 'unknown';

  return livingArrangementsCompatible(maleValue, femaleValue)
    ? 'match'
    : 'mismatch';
}

function emptyKabinFields() {
  return {
    viewerKabinMin: null,
    viewerKabinMax: null,
    otherKabinMin: null,
    otherKabinMax: null,
  } as const;
}

function emptyLivingOtherFields() {
  return {
    viewerLivingOther: null,
    otherLivingOther: null,
  } as const;
}

function scoreRows(rows: MaritalAlignmentRow[]): {
  score: number;
  matchedCount: number;
  totalCriteria: number;
} {
  const scorable = rows.filter(
    (row) => row.status === 'match' || row.status === 'mismatch',
  );
  const matchedCount = scorable.filter((row) => row.status === 'match').length;
  const totalCriteria = scorable.length;
  const score =
    totalCriteria === 0
      ? 0
      : Math.round((matchedCount / totalCriteria) * 100);

  return { score, matchedCount, totalCriteria };
}

export function buildMaritalAlignmentComparison(input: {
  viewer: MaritalProfileSnapshot;
  other: MaritalProfileSnapshot;
  viewerVisibility: Partial<Record<MaritalAlignmentKey, boolean>>;
  otherVisibility: Partial<Record<MaritalAlignmentKey, boolean>>;
}): MaritalAlignmentResult {
  const rows: MaritalAlignmentRow[] = [
    {
      key: 'expected_marriage_timeline',
      status: evaluateStringAlignment(
        input.viewer.expectedMarriageTimeline,
        input.other.expectedMarriageTimeline,
        input.viewerVisibility.expected_marriage_timeline === false,
        input.otherVisibility.expected_marriage_timeline === false,
      ),
      viewerValue: input.viewer.expectedMarriageTimeline ?? null,
      otherValue: input.other.expectedMarriageTimeline ?? null,
      ...emptyKabinFields(),
      ...emptyLivingOtherFields(),
      viewerHidden: input.viewerVisibility.expected_marriage_timeline === false,
      otherHidden: input.otherVisibility.expected_marriage_timeline === false,
    },
    {
      key: 'expected_parenthood_timeline',
      status: evaluateStringAlignment(
        input.viewer.expectedParenthoodTimeline,
        input.other.expectedParenthoodTimeline,
        input.viewerVisibility.expected_parenthood_timeline === false,
        input.otherVisibility.expected_parenthood_timeline === false,
      ),
      viewerValue: input.viewer.expectedParenthoodTimeline ?? null,
      otherValue: input.other.expectedParenthoodTimeline ?? null,
      ...emptyKabinFields(),
      ...emptyLivingOtherFields(),
      viewerHidden:
        input.viewerVisibility.expected_parenthood_timeline === false,
      otherHidden: input.otherVisibility.expected_parenthood_timeline === false,
    },
    {
      key: 'wedding_ceremony_preference',
      status: evaluateStringAlignment(
        input.viewer.weddingCeremonyPreference,
        input.other.weddingCeremonyPreference,
        input.viewerVisibility.wedding_ceremony_preference === false,
        input.otherVisibility.wedding_ceremony_preference === false,
      ),
      viewerValue: input.viewer.weddingCeremonyPreference ?? null,
      otherValue: input.other.weddingCeremonyPreference ?? null,
      ...emptyKabinFields(),
      ...emptyLivingOtherFields(),
      viewerHidden:
        input.viewerVisibility.wedding_ceremony_preference === false,
      otherHidden:
        input.otherVisibility.wedding_ceremony_preference === false,
    },
    {
      key: 'living_arrangements',
      status: evaluateLivingArrangementsAlignment(
        input.viewer,
        input.other,
        input.viewerVisibility.living_arrangements === false,
        input.otherVisibility.living_arrangements === false,
      ),
      viewerValue: input.viewer.livingArrangements ?? null,
      otherValue: input.other.livingArrangements ?? null,
      ...emptyKabinFields(),
      viewerLivingOther: input.viewer.livingArrangementsOther ?? null,
      otherLivingOther: input.other.livingArrangementsOther ?? null,
      viewerHidden: input.viewerVisibility.living_arrangements === false,
      otherHidden: input.otherVisibility.living_arrangements === false,
    },
    {
      key: 'expected_kabin_amount',
      status: evaluateKabinAlignment(
        input.viewer,
        input.other,
        input.viewerVisibility.expected_kabin_amount === false,
        input.otherVisibility.expected_kabin_amount === false,
      ),
      viewerValue: null,
      otherValue: null,
      viewerKabinMin: input.viewer.expectedKabinAmountMinBdt ?? null,
      viewerKabinMax: input.viewer.expectedKabinAmountMaxBdt ?? null,
      otherKabinMin: input.other.expectedKabinAmountMinBdt ?? null,
      otherKabinMax: input.other.expectedKabinAmountMaxBdt ?? null,
      viewerLivingOther: null,
      otherLivingOther: null,
      viewerHidden: input.viewerVisibility.expected_kabin_amount === false,
      otherHidden: input.otherVisibility.expected_kabin_amount === false,
    },
  ];

  const { score, matchedCount, totalCriteria } = scoreRows(rows);

  return {
    score,
    matchedCount,
    totalCriteria,
    viewerGender: input.viewer.gender ?? null,
    otherGender: input.other.gender ?? null,
    rows,
  };
}
