import {
  formatHeightFromCm,
  getLivingArrangementsDropdownCategory,
  isAllBangladeshDistrictsPreferenceText,
  isAnyReligionPreferenceText,
  isOpenToAllDistricts,
  isOpenToAnyReligion,
  isoDateToDisplay,
} from '@easymatch/shared';

export type DropdownMap = Record<
  string,
  Array<{ value: string; label: string; parentValue?: string | null }>
>;

const FIELD_DROPDOWN_CATEGORY: Record<string, string> = {
  gender: 'gender',
  marital_status: 'marital_status',
  complexion: 'complexion',
  religion: 'religion',
  has_beard: 'has_beard',
  hasBeard: 'has_beard',
  smoking_habit: 'smoking_habit',
  smokingHabit: 'smoking_habit',
  prayer_practice: 'prayer_practice',
  hijab_practice: 'hijab_practice',
  highest_degree: 'education',
  highestDegree: 'education',
  education_medium: 'education_medium',
  educationMedium: 'education_medium',
  education_subject: 'education_subject',
  educationSubject: 'education_subject',
  occupation: 'occupation',
  monthly_income: 'income_range',
  monthlyIncomeRange: 'income_range',
  current_division: 'division',
  permanent_division: 'division',
  current_district: 'district',
  permanent_district: 'district',
  currentDivision: 'division',
  currentDistrict: 'district',
  permanentDivision: 'division',
  permanentDistrict: 'district',
  currentUpazila: 'upazila',
  permanentUpazila: 'upazila',
  father_education: 'education',
  mother_education: 'education',
  fatherEducation: 'education',
  motherEducation: 'education',
  father_profession: 'occupation',
  mother_profession: 'occupation',
  fatherProfession: 'occupation',
  motherProfession: 'occupation',
  father_is_alive: 'is_alive',
  mother_is_alive: 'is_alive',
  fatherIsAlive: 'is_alive',
  motherIsAlive: 'is_alive',
  family_type: 'family_type',
  family_status: 'family_status',
  familyType: 'family_type',
  familyStatus: 'family_status',
  minimumEducation: 'education',
  preferredProfession: 'occupation',
  preferredReligion: 'religion',
  beardPreference: 'beard_preference',
  prayerPreference: 'prayer_preference',
  hijabPreference: 'hijab_preference',
  maritalStatusPref: 'marital_status',
  preferredDistricts: 'district',
  relationship: 'sibling_relationship',
  maritalStatus: 'marital_status',
  education: 'education',
  profession: 'occupation',
  spouseEducation: 'education',
  spouseProfession: 'occupation',
  expected_marriage_timeline: 'expected_marriage_timeline',
  expectedMarriageTimeline: 'expected_marriage_timeline',
  dowry_expectation: 'dowry_expectation',
  dowryExpectation: 'dowry_expectation',
  wedding_ceremony_preference: 'wedding_ceremony_preference',
  weddingCeremonyPreference: 'wedding_ceremony_preference',
  expected_parenthood_timeline: 'expected_parenthood_timeline',
  expectedParenthoodTimeline: 'expected_parenthood_timeline',
  living_arrangements: 'living_arrangements',
  livingArrangements: 'living_arrangements',
};

const STATIC_OPTION_FALLBACKS: Record<string, Record<string, string>> = {
  hasBeardOptions: {
    yes: 'Yes',
    no: 'No',
    prefer_not_to_say: 'Do not want to say',
  },
  smokingHabitOptions: {
    yes: 'Yes',
    no: 'No',
    prefer_not_to_share: 'Do not want to share',
  },
  expectedMarriageTimelineOptions: {
    one_year: '1 Year',
    two_years: '2 Years',
    as_soon_as_possible: 'As soon as possible',
  },
  dowryExpectationOptions: {
    yes: 'Yes',
    no: 'No',
    can_be_discussed: 'Can be discussed and negotiated',
    prefer_not_to_share: 'Not willing to share now',
  },
  weddingCeremonyPreferenceOptions: {
    simple: 'Simple',
    modest: 'Modest',
    grand: 'Grand',
    can_be_discussed_later: 'Can be discussed later',
  },
  expectedParenthoodTimelineOptions: {
    within_one_year: 'Within a year',
    within_two_years: 'Within 2 years',
    within_three_four_years: 'Within 3–4 years',
    can_be_agreed_later: 'Can be agreed later',
  },
  livingArrangementsOptions: {
    live_with_my_family: 'Live with my family',
    live_away_from_my_family: 'Live away from my family',
    can_be_discussed_later: 'Can be discussed and agreed later',
    live_with_family_2_3_years: 'Live with my family for 2–3 years',
    other_arrangements: 'Other arrangements',
    dont_intend_live_with_in_laws: "I don't intend to live with in-laws",
    intend_live_with_in_laws: 'I intend to live with in-laws',
    no_preference: 'I have no preference',
    live_separately_after_2_3_years:
      'Intend to live separately away from in-laws after 2–3 years',
  },
  prayerPracticeOptions: {
    five_times_regularly: 'Pray 5 times regularly',
    occasionally: 'Pray occasionally',
    friday_only: 'Pray only on Friday',
    never: 'Never pray',
    prefer_not_to_say: 'Do not want to share',
  },
  hijabPracticeOptions: {
    wear_regularly: 'I wear Hijab regularly',
    wear_occasionally: 'I wear Hijab occasionally',
    never_wear: 'I never wear Hijab',
    intend_to_wear: 'I intend to wear Hijab',
  },
  isAliveOptions: {
    yes: 'Yes',
    no: 'No',
    prefer_not_to_say: 'Do not want to share',
  },
  beardPreferenceOptions: {
    yes: 'Yes',
    no: 'No',
    no_opinion: 'No opinion',
  },
  prayerPreferenceOptions: {
    regular_five_times: 'Regular 5 times',
    no_opinion: 'No opinion',
    modestly_practicing: 'Modestly practicing',
  },
  hijabPreferenceOptions: {
    regular_hijabi_partner: 'Want regular Hijabi partner',
    irregular_hijabi_ok: 'Irregular Hijabi partner is ok',
    no_hijab_needed: 'No need to wear Hijab',
    intention_to_wear_hijab: 'Should have intention to wear Hijab',
  },
};

const STATIC_OPTION_GROUPS: Record<string, string> = {
  has_beard: 'hasBeardOptions',
  hasBeard: 'hasBeardOptions',
  smoking_habit: 'smokingHabitOptions',
  smokingHabit: 'smokingHabitOptions',
  expected_marriage_timeline: 'expectedMarriageTimelineOptions',
  expectedMarriageTimeline: 'expectedMarriageTimelineOptions',
  dowry_expectation: 'dowryExpectationOptions',
  dowryExpectation: 'dowryExpectationOptions',
  wedding_ceremony_preference: 'weddingCeremonyPreferenceOptions',
  weddingCeremonyPreference: 'weddingCeremonyPreferenceOptions',
  expected_parenthood_timeline: 'expectedParenthoodTimelineOptions',
  expectedParenthoodTimeline: 'expectedParenthoodTimelineOptions',
  living_arrangements: 'livingArrangementsOptions',
  livingArrangements: 'livingArrangementsOptions',
  prayer_practice: 'prayerPracticeOptions',
  hijab_practice: 'hijabPracticeOptions',
  father_is_alive: 'isAliveOptions',
  mother_is_alive: 'isAliveOptions',
  fatherIsAlive: 'isAliveOptions',
  motherIsAlive: 'isAliveOptions',
  beardPreference: 'beardPreferenceOptions',
  prayerPreference: 'prayerPreferenceOptions',
  hijabPreference: 'hijabPreferenceOptions',
};

const PATERNAL_RELATION_LABELS: Record<string, string> = {
  uncle: 'Uncle',
  aunty: 'Aunty',
  paternal_grandfather: 'Paternal Grandfather',
  paternal_grandmother: 'Paternal Grandmother',
};

const MATERNAL_RELATION_LABELS: Record<string, string> = {
  uncle: 'Uncle',
  aunty: 'Aunty',
  maternal_grandfather: 'Maternal Grandfather',
  maternal_grandmother: 'Maternal Grandmother',
};

const ON_BEHALF_RELATION_LABELS: Record<string, string> = {
  my_son: 'My son',
  my_daughter: 'My daughter',
  my_relative: 'My relatives',
  someone_else: 'For someone else',
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function lookupDropdownLabel(
  dropdowns: DropdownMap,
  category: string | undefined,
  value: string,
): string | undefined {
  if (!category) return undefined;
  return dropdowns[category]?.find((item) => item.value === value)?.label;
}

function resolveStaticOptionLabel(fieldKey: string, value: string): string | undefined {
  const group = STATIC_OPTION_GROUPS[fieldKey];
  if (!group) return undefined;
  return STATIC_OPTION_FALLBACKS[group]?.[value];
}

function resolveRelativeRelationLabel(
  group: 'paternal' | 'maternal',
  value: string,
): string | undefined {
  const map =
    group === 'paternal' ? PATERNAL_RELATION_LABELS : MATERNAL_RELATION_LABELS;
  return map[value];
}

export function formatBiodataFieldValueForExport(
  key: string,
  value: unknown,
  options: {
    dropdowns: DropdownMap;
    personal?: Record<string, unknown>;
    relativeRelationGroup?: 'paternal' | 'maternal';
    locale?: string;
  },
): string {
  const { dropdowns, personal, relativeRelationGroup } = options;
  const locale = options.locale ?? 'en';

  if (value === null || value === undefined || value === '') {
    if (key === 'preferredReligion') {
      return 'Any religion';
    }
    return '';
  }

  if (key === 'heightCm' && personal?.heightCm != null) {
    return formatHeightFromCm(personal.heightCm as number) ?? '';
  }

  if (key === 'weight' && typeof value === 'number') {
    return `${value} kg`;
  }

  if (
    (key === 'expected_kabin_amount_min_bdt' ||
      key === 'expected_kabin_amount_max_bdt' ||
      key === 'expectedKabinAmountMinBdt' ||
      key === 'expectedKabinAmountMaxBdt') &&
    typeof value === 'number'
  ) {
    return `${value.toLocaleString(locale)} BDT`;
  }

  if (
    (key === 'heightMinCm' || key === 'heightMaxCm') &&
    typeof value === 'number'
  ) {
    return formatHeightFromCm(value) ?? '';
  }

  if (
    (key === 'weightMinKg' || key === 'weightMaxKg') &&
    typeof value === 'number'
  ) {
    return `${value} kg`;
  }

  if (key === 'date_of_birth' && typeof value === 'string') {
    return isoDateToDisplay(value) ?? value;
  }

  if (Array.isArray(value)) {
    if (key === 'preferredDistricts' && isOpenToAllDistricts(value)) {
      return 'All districts of Bangladesh';
    }
    const category = FIELD_DROPDOWN_CATEGORY[key];
    return value
      .map((item) => {
        const raw = String(item);
        return (
          lookupDropdownLabel(dropdowns, category, raw) ??
          resolveStaticOptionLabel(key, raw) ??
          raw
        );
      })
      .join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  const raw = String(value);

  if (key === 'preferredReligion' && isAnyReligionPreferenceText(raw)) {
    return 'Any religion';
  }
  if (key === 'preferredReligion' && isOpenToAnyReligion(raw)) {
    return 'Any religion';
  }
  if (
    key === 'preferredDistricts' &&
    isAllBangladeshDistrictsPreferenceText(raw)
  ) {
    return 'All districts of Bangladesh';
  }

  if (key === 'relation' && relativeRelationGroup) {
    const label = resolveRelativeRelationLabel(relativeRelationGroup, raw);
    if (label) return label;
  }

  if (key === 'on_behalf_relation' || key === 'onBehalfRelation') {
    return ON_BEHALF_RELATION_LABELS[raw] ?? raw;
  }

  if (
    key === 'profileBiodataReviewStatus' ||
    key === 'biodata_review_status' ||
    key === 'status'
  ) {
    return REVIEW_STATUS_LABELS[raw] ?? raw;
  }

  if (key === 'creation_mode' || key === 'creationMode') {
    if (raw === 'self') return 'Self';
    if (raw === 'on_behalf') return 'On behalf';
  }

  const category = FIELD_DROPDOWN_CATEGORY[key];
  if (key === 'living_arrangements' || key === 'livingArrangements') {
    const gender =
      typeof personal?.gender === 'string' ? personal.gender : undefined;
    const livingCategory = getLivingArrangementsDropdownCategory(gender);
    const fromLivingDropdown = lookupDropdownLabel(
      dropdowns,
      livingCategory ?? undefined,
      raw,
    );
    if (fromLivingDropdown) return fromLivingDropdown;
  } else {
    const fromDropdown = lookupDropdownLabel(dropdowns, category, raw);
    if (fromDropdown) return fromDropdown;
  }

  const fromStatic = resolveStaticOptionLabel(key, raw);
  if (fromStatic) return fromStatic;

  return raw;
}

export function formatBiodataSectionForExport(
  section: Record<string, unknown>,
  dropdowns: DropdownMap,
  personal?: Record<string, unknown>,
): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const [key, value] of Object.entries(section)) {
    formatted[key] = formatBiodataFieldValueForExport(key, value, {
      dropdowns,
      personal: personal ?? section,
    });
  }
  return formatted;
}

export function formatBiodataRecordsForExport(
  records: Record<string, unknown>[] | null | undefined,
  dropdowns: DropdownMap,
  personal: Record<string, unknown>,
  relativeRelationGroup?: 'paternal' | 'maternal',
): string {
  if (!records?.length) {
    return '';
  }

  const formatted = records.map((record) => {
    const row: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      row[key] = formatBiodataFieldValueForExport(key, value, {
        dropdowns,
        personal,
        relativeRelationGroup:
          key === 'relation' ? relativeRelationGroup : undefined,
      });
    }
    return row;
  });

  return JSON.stringify(formatted);
}

export function formatNidDocumentsForExport(
  documents:
    | Array<{
        subject: string;
        side: string;
        status: string;
        reviewedAt: string | null;
      }>
    | undefined,
): string {
  if (!documents?.length) {
    return '';
  }

  const formatted = documents.map((doc) => ({
    subject: doc.subject === 'creator' ? 'Creator' : 'Member',
    side: doc.side === 'front' ? 'Front' : 'Back',
    status: REVIEW_STATUS_LABELS[doc.status] ?? doc.status,
    reviewedAt: doc.reviewedAt ?? '',
  }));

  return JSON.stringify(formatted);
}
