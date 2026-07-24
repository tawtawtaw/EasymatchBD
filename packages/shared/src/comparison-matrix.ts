import {
  formatHeightFromCm,
  formatHeightRangeFromCm,
} from './height';
import {
  matchesHijabPreference,
  showBeardPreferenceField,
  showHijabPreferenceField,
  showPrayerPreferenceField,
} from './islam-partner-preferences';
import {
  matchesPreferredDistricts,
  preferredDistrictsPreferenceText,
} from './partner-districts';
import {
  isOpenToAnyReligion,
  matchesPreferredReligion,
  preferredReligionPreferenceText,
} from './partner-religion-preference';

export function ageFromDateOfBirth(
  dateOfBirth: Date | string,
): number | null {
  const birth =
    typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
}

export type ComparisonStatus =
  | 'match'
  | 'mismatch'
  | 'unknown'
  | 'not_set'
  | 'not_applicable';

export type ComparisonCriterionKey =
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
  | 'hijab';

export type ComparisonPartnerPreference = {
  ageMin?: number | null;
  ageMax?: number | null;
  heightMinCm?: number | null;
  heightMaxCm?: number | null;
  weightMinKg?: number | null;
  weightMaxKg?: number | null;
  preferredDistricts?: string[];
  minimumEducation?: string | null;
  preferredProfession?: string[];
  preferredReligion?: string | null;
  beardPreference?: string | null;
  prayerPreference?: string | null;
  hijabPreference?: string | null;
  maritalStatusPref?: string[];
};

export type ComparisonProfileAttributes = {
  gender?: string | null;
  religion?: string | null;
  dateOfBirth?: Date | string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  currentDistrict?: string | null;
  highestDegree?: string | null;
  occupation?: string | null;
  maritalStatus?: string | null;
  hasBeard?: string | null;
  prayerPractice?: string | null;
  hijabPractice?: string | null;
};

export type ComparisonRow = {
  key: ComparisonCriterionKey;
  status: ComparisonStatus;
  expectationValue: string | null;
  attributeValue: string | null;
  expectationHidden: boolean;
  attributeHidden: boolean;
};

export type ComparisonDirectionResult = {
  score: number;
  matchedCount: number;
  totalCriteria: number;
  rows: ComparisonRow[];
  available: boolean;
};

export type BidirectionalComparisonResult = {
  viewerToOther: ComparisonDirectionResult;
  otherToViewer: ComparisonDirectionResult;
  mutualScore: number;
  otherPreferencesVisible: boolean;
};

type CriterionContext = {
  preferences: ComparisonPartnerPreference | null | undefined;
  attributes: ComparisonProfileAttributes;
  attributeVisibility: Partial<Record<ComparisonCriterionKey, boolean>>;
  preferenceVisibility: Partial<Record<ComparisonCriterionKey, boolean>>;
  viewerGender?: string | null;
  viewerReligion?: string | null;
};

function isAttributeVisible(
  ctx: CriterionContext,
  key: ComparisonCriterionKey,
): boolean {
  return ctx.attributeVisibility[key] !== false;
}

function isPreferenceVisible(
  ctx: CriterionContext,
  key: ComparisonCriterionKey,
): boolean {
  return ctx.preferenceVisibility[key] !== false;
}

function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  unit: string,
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}–${max} ${unit}`;
  if (min != null) return `${min}+ ${unit}`;
  return `Up to ${max} ${unit}`;
}

function evaluateRow(
  key: ComparisonCriterionKey,
  ctx: CriterionContext,
  evaluate: (ctx: CriterionContext) => {
    hasPreference: boolean;
    preferenceText: string | null;
    attributeText: string | null;
    matches: boolean | null;
    applicable: boolean;
  },
): ComparisonRow {
  const prefVisible = isPreferenceVisible(ctx, key);
  const attrVisible = isAttributeVisible(ctx, key);

  if (!prefVisible) {
    const result = evaluate(ctx);
    return {
      key,
      status: 'unknown',
      expectationValue: null,
      attributeValue: attrVisible ? result.attributeText : null,
      expectationHidden: true,
      attributeHidden: !attrVisible,
    };
  }

  const result = evaluate(ctx);

  if (!result.applicable) {
    return {
      key,
      status: 'not_applicable',
      expectationValue: result.preferenceText,
      attributeValue: result.attributeText,
      expectationHidden: false,
      attributeHidden: !attrVisible,
    };
  }

  if (!result.hasPreference) {
    return {
      key,
      status: 'not_set',
      expectationValue: null,
      attributeValue: attrVisible ? result.attributeText : null,
      expectationHidden: false,
      attributeHidden: !attrVisible,
    };
  }

  if (!attrVisible || result.attributeText == null) {
    return {
      key,
      status: 'unknown',
      expectationValue: result.preferenceText,
      attributeValue: null,
      expectationHidden: false,
      attributeHidden: !attrVisible,
    };
  }

  return {
    key,
    status: result.matches ? 'match' : 'mismatch',
    expectationValue: result.preferenceText,
    attributeValue: result.attributeText,
    expectationHidden: false,
    attributeHidden: false,
  };
}

function buildRows(ctx: CriterionContext): ComparisonRow[] {
  const rows: ComparisonRow[] = [];

  rows.push(
    evaluateRow('age', ctx, (c) => {
      const prefs = c.preferences;
      const hasPreference = prefs?.ageMin != null || prefs?.ageMax != null;
      const age =
        c.attributes.dateOfBirth != null
          ? ageFromDateOfBirth(c.attributes.dateOfBirth)
          : null;
      const attributeText = age != null ? String(age) : null;
      const preferenceText = formatRange(prefs?.ageMin, prefs?.ageMax, 'years');
      const matches =
        age != null &&
        age >= (prefs?.ageMin ?? 18) &&
        age <= (prefs?.ageMax ?? 80);
      return { hasPreference, preferenceText, attributeText, matches, applicable: true };
    }),
  );

  rows.push(
    evaluateRow('height', ctx, (c) => {
      const prefs = c.preferences;
      const hasPreference =
        prefs?.heightMinCm != null || prefs?.heightMaxCm != null;
      const height = c.attributes.heightCm;
      const attributeText = formatHeightFromCm(height);
      const preferenceText = formatHeightRangeFromCm(
        prefs?.heightMinCm,
        prefs?.heightMaxCm,
      );
      const matches =
        height != null &&
        height >= (prefs?.heightMinCm ?? 100) &&
        height <= (prefs?.heightMaxCm ?? 250);
      return { hasPreference, preferenceText, attributeText, matches, applicable: true };
    }),
  );

  rows.push(
    evaluateRow('weight', ctx, (c) => {
      const prefs = c.preferences;
      const hasPreference =
        prefs?.weightMinKg != null || prefs?.weightMaxKg != null;
      const weight = c.attributes.weightKg;
      const attributeText = weight != null ? `${weight} kg` : null;
      const preferenceText = formatRange(
        prefs?.weightMinKg,
        prefs?.weightMaxKg,
        'kg',
      );
      const matches =
        weight != null &&
        weight >= (prefs?.weightMinKg ?? 30) &&
        weight <= (prefs?.weightMaxKg ?? 200);
      return { hasPreference, preferenceText, attributeText, matches, applicable: true };
    }),
  );

  rows.push(
    evaluateRow('district', ctx, (c) => {
      if (c.preferences == null) {
        return {
          hasPreference: false,
          preferenceText: null,
          attributeText: c.attributes.currentDistrict ?? null,
          matches: false,
          applicable: true,
        };
      }
      const districts = c.preferences.preferredDistricts ?? [];
      const district = c.attributes.currentDistrict ?? null;
      const preferenceText = preferredDistrictsPreferenceText(districts);
      const matches = matchesPreferredDistricts(districts, district);
      return {
        hasPreference: true,
        preferenceText,
        attributeText: district,
        matches,
        applicable: true,
      };
    }),
  );

  rows.push(
    evaluateRow('education', ctx, (c) => {
      const expected = c.preferences?.minimumEducation ?? null;
      const actual = c.attributes.highestDegree ?? null;
      const hasPreference = !!expected;
      return {
        hasPreference,
        preferenceText: expected,
        attributeText: actual,
        matches: !!actual && !!expected && actual === expected,
        applicable: true,
      };
    }),
  );

  rows.push(
    evaluateRow('profession', ctx, (c) => {
      const expected = c.preferences?.preferredProfession ?? [];
      const actual = c.attributes.occupation ?? null;
      const hasPreference = expected.length > 0;
      return {
        hasPreference,
        preferenceText: hasPreference ? expected.join(', ') : null,
        attributeText: actual,
        matches: !!actual && hasPreference && expected.includes(actual),
        applicable: true,
      };
    }),
  );

  rows.push(
    evaluateRow('marital_status', ctx, (c) => {
      const expected = c.preferences?.maritalStatusPref ?? [];
      const actual = c.attributes.maritalStatus ?? null;
      const hasPreference = expected.length > 0;
      return {
        hasPreference,
        preferenceText: hasPreference ? expected.join(', ') : null,
        attributeText: actual,
        matches: !!actual && hasPreference && expected.includes(actual),
        applicable: true,
      };
    }),
  );

  rows.push(
    evaluateRow('religion', ctx, (c) => {
      if (c.preferences == null) {
        return {
          hasPreference: false,
          preferenceText: null,
          attributeText: c.attributes.religion ?? null,
          matches: false,
          applicable: true,
        };
      }

      const expectedPref = c.preferences.preferredReligion ?? null;
      const actual = c.attributes.religion ?? null;

      // No partner religion preference — compare mandatory profile religions.
      if (isOpenToAnyReligion(expectedPref)) {
        const viewerReligion = c.viewerReligion ?? null;
        return {
          hasPreference: !!viewerReligion,
          preferenceText: viewerReligion,
          attributeText: actual,
          matches:
            !!viewerReligion &&
            !!actual &&
            viewerReligion === actual,
          applicable: true,
        };
      }

      const preferenceText = preferredReligionPreferenceText(expectedPref);
      const matches = matchesPreferredReligion(expectedPref, actual);
      return {
        hasPreference: true,
        preferenceText,
        attributeText: actual,
        matches,
        applicable: true,
      };
    }),
  );

  rows.push(
    evaluateRow('beard', ctx, (c) => {
      const applicable = showBeardPreferenceField(
        c.viewerReligion,
        c.viewerGender,
      );
      const expected = c.preferences?.beardPreference ?? null;
      const hasPreference = !!expected;
      if (expected === 'no_opinion') {
        return {
          hasPreference,
          preferenceText: expected,
          attributeText: c.attributes.hasBeard ?? null,
          matches: true,
          applicable,
        };
      }
      return {
        hasPreference,
        preferenceText: expected,
        attributeText: c.attributes.hasBeard ?? null,
        matches:
          !!c.attributes.hasBeard &&
          !!expected &&
          c.attributes.hasBeard === expected,
        applicable,
      };
    }),
  );

  rows.push(
    evaluateRow('prayer', ctx, (c) => {
      const applicable = showPrayerPreferenceField(c.viewerReligion);
      const expected = c.preferences?.prayerPreference ?? null;
      const hasPreference = !!expected;
      if (expected === 'no_opinion') {
        return {
          hasPreference,
          preferenceText: expected,
          attributeText: c.attributes.prayerPractice ?? null,
          matches: true,
          applicable,
        };
      }
      return {
        hasPreference,
        preferenceText: expected,
        attributeText: c.attributes.prayerPractice ?? null,
        matches:
          !!c.attributes.prayerPractice &&
          !!expected &&
          c.attributes.prayerPractice === expected,
        applicable,
      };
    }),
  );

  rows.push(
    evaluateRow('hijab', ctx, (c) => {
      const applicable = showHijabPreferenceField(
        c.viewerReligion,
        c.viewerGender,
      );
      const expected = c.preferences?.hijabPreference ?? null;
      const hasPreference = !!expected;
      return {
        hasPreference,
        preferenceText: expected,
        attributeText: c.attributes.hijabPractice ?? null,
        matches:
          !!c.attributes.hijabPractice &&
          !!expected &&
          matchesHijabPreference(expected, c.attributes.hijabPractice),
        applicable,
      };
    }),
  );

  return rows;
}

function scoreRows(rows: ComparisonRow[]): {
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

export function buildComparisonDirection(
  input: {
    preferences: ComparisonPartnerPreference | null | undefined;
    attributes: ComparisonProfileAttributes;
    attributeVisibility?: Partial<Record<ComparisonCriterionKey, boolean>>;
    preferenceVisibility?: Partial<Record<ComparisonCriterionKey, boolean>>;
    expectationsAvailable?: boolean;
    viewerGender?: string | null;
    viewerReligion?: string | null;
  },
): ComparisonDirectionResult {
  const ctx: CriterionContext = {
    preferences: input.preferences,
    attributes: input.attributes,
    attributeVisibility: input.attributeVisibility ?? {},
    preferenceVisibility: input.preferenceVisibility ?? {},
    viewerGender: input.viewerGender,
    viewerReligion: input.viewerReligion,
  };

  const available = input.expectationsAvailable !== false;
  const rows = available ? buildRows(ctx) : [];
  const { score, matchedCount, totalCriteria } = scoreRows(rows);

  return {
    score,
    matchedCount,
    totalCriteria,
    rows,
    available,
  };
}

export function buildBidirectionalComparison(input: {
  viewer: {
    preferences: ComparisonPartnerPreference | null | undefined;
    attributes: ComparisonProfileAttributes;
    gender?: string | null;
    religion?: string | null;
  };
  other: {
    preferences: ComparisonPartnerPreference | null | undefined;
    attributes: ComparisonProfileAttributes;
    gender?: string | null;
    religion?: string | null;
  };
  otherAttributeVisibility: Partial<Record<ComparisonCriterionKey, boolean>>;
  otherPreferenceVisibility: Partial<Record<ComparisonCriterionKey, boolean>>;
  otherPreferencesAvailable: boolean;
}): BidirectionalComparisonResult {
  const viewerToOther = buildComparisonDirection({
    preferences: input.viewer.preferences,
    attributes: input.other.attributes,
    attributeVisibility: input.otherAttributeVisibility,
    viewerGender: input.viewer.gender,
    viewerReligion: input.viewer.religion,
    expectationsAvailable: true,
  });

  const otherToViewer = buildComparisonDirection({
    preferences: input.other.preferences,
    attributes: input.viewer.attributes,
    attributeVisibility: {
      age: true,
      height: true,
      weight: true,
      district: true,
      education: true,
      profession: true,
      marital_status: true,
      religion: true,
      beard: true,
      prayer: true,
      hijab: true,
    },
    preferenceVisibility: input.otherPreferenceVisibility,
    viewerGender: input.other.gender,
    viewerReligion: input.other.religion,
    expectationsAvailable: input.otherPreferencesAvailable,
  });

  const mutualScore =
    otherToViewer.available && otherToViewer.totalCriteria > 0
      ? Math.min(viewerToOther.score, otherToViewer.score)
      : viewerToOther.score;

  return {
    viewerToOther,
    otherToViewer,
    mutualScore,
    otherPreferencesVisible: input.otherPreferencesAvailable,
  };
}
