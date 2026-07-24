import { PrivacyLevel } from './privacy-levels';

export const ProfileFieldSection = {
  PERSONAL: 'personal',
  FAMILY: 'family',
  MARITAL: 'marital',
  PARTNER: 'partner',
  MEDIA: 'media',
} as const;

export type ProfileFieldSection =
  (typeof ProfileFieldSection)[keyof typeof ProfileFieldSection];

export type ProfilePrivacyFieldMeta = {
  section: ProfileFieldSection;
  defaultShareable: boolean;
  defaultMinLevel: PrivacyLevel;
};

/** Canonical profile field keys for privacy / discovery visibility rules */
export const PROFILE_PRIVACY_FIELDS = {
  // Personal
  FULL_NAME: 'full_name',
  GENDER: 'gender',
  DATE_OF_BIRTH: 'date_of_birth',
  MARITAL_STATUS: 'marital_status',
  DIVORCE_DETAILS: 'divorce_details',
  CHILDREN_COUNT: 'children_count',
  HEIGHT: 'height',
  WEIGHT: 'weight',
  COMPLEXION: 'complexion',
  RELIGION: 'religion',
  HAS_BEARD: 'has_beard',
  PRAYER_PRACTICE: 'prayer_practice',
  HIJAB_PRACTICE: 'hijab_practice',
  SMOKING_HABIT: 'smoking_habit',
  HAS_DISABILITY: 'has_disability',
  DISABILITY_INFO: 'disability_info',
  EDUCATION_MEDIUM: 'education_medium',
  HIGHEST_DEGREE: 'highest_degree',
  ADDITIONAL_EDUCATION_QUALIFICATIONS: 'additional_education_qualifications',
  INSTITUTION: 'institution',
  EDUCATION_YEAR: 'education_year',
  EDUCATION_SUBJECT: 'education_subject',
  OCCUPATION: 'occupation',
  COMPANY: 'company',
  DESIGNATION: 'designation',
  MONTHLY_INCOME: 'monthly_income',
  CURRENT_COUNTRY: 'current_country',
  CURRENT_DIVISION: 'current_division',
  CURRENT_DISTRICT: 'current_district',
  CURRENT_UPAZILA: 'current_upazila',
  CURRENT_CITY_TOWN: 'current_city_town',
  CURRENT_ADDRESS: 'current_address',
  PERMANENT_DIVISION: 'permanent_division',
  PERMANENT_COUNTRY: 'permanent_country',
  PERMANENT_DISTRICT: 'permanent_district',
  PERMANENT_UPAZILA: 'permanent_upazila',
  PERMANENT_CITY_TOWN: 'permanent_city_town',
  PERMANENT_ADDRESS: 'permanent_address',
  INTRODUCTION: 'introduction',
  BIOGRAPHY: 'biography',
  HOBBIES: 'hobbies',
  INTERESTS: 'interests',
  // Marital information
  EXPECTED_MARRIAGE_TIMELINE: 'expected_marriage_timeline',
  DOWRY_EXPECTATION: 'dowry_expectation',
  WEDDING_CEREMONY_PREFERENCE: 'wedding_ceremony_preference',
  EXPECTED_PARENTHOOD_TIMELINE: 'expected_parenthood_timeline',
  LIVING_ARRANGEMENTS: 'living_arrangements',
  LIVING_ARRANGEMENTS_OTHER: 'living_arrangements_other',
  EXPECTED_KABIN_AMOUNT_MIN_BDT: 'expected_kabin_amount_min_bdt',
  EXPECTED_KABIN_AMOUNT_MAX_BDT: 'expected_kabin_amount_max_bdt',
  // Family
  FATHER_NAME: 'father_name',
  FATHER_IS_ALIVE: 'father_is_alive',
  FATHER_EDUCATION: 'father_education',
  FATHER_PROFESSION: 'father_profession',
  MOTHER_NAME: 'mother_name',
  MOTHER_IS_ALIVE: 'mother_is_alive',
  MOTHER_EDUCATION: 'mother_education',
  MOTHER_PROFESSION: 'mother_profession',
  FAMILY_TYPE: 'family_type',
  FAMILY_STATUS: 'family_status',
  FAMILY_VALUES: 'family_values',
  FAMILY_ASSETS: 'family_assets',
  SIBLINGS: 'siblings',
  PATERNAL_RELATIVES: 'paternal_relatives',
  MATERNAL_RELATIVES: 'maternal_relatives',
  // Partner expectations (usually private; admin can enable sharing)
  PARTNER_AGE_RANGE: 'partner_age_range',
  PARTNER_HEIGHT_RANGE: 'partner_height_range',
  PARTNER_WEIGHT_RANGE: 'partner_weight_range',
  PARTNER_DISTRICTS: 'partner_districts',
  PARTNER_EDUCATION: 'partner_education',
  PARTNER_PROFESSION: 'partner_profession',
  PARTNER_BEARD_PREFERENCE: 'partner_beard_preference',
  PARTNER_PRAYER_PREFERENCE: 'partner_prayer_preference',
  PARTNER_HIJAB_PREFERENCE: 'partner_hijab_preference',
  PARTNER_RELIGION: 'partner_religion',
  PARTNER_MARITAL_STATUS: 'partner_marital_status',
  PARTNER_NOTES: 'partner_notes',
  // Media & contact
  PRIMARY_PHOTO: 'primary_photo',
  GALLERY_PHOTOS: 'gallery_photos',
  VERIFIED_BADGE: 'verified_badge',
  PHONE: 'phone',
} as const;

export type ProfilePrivacyFieldKey =
  (typeof PROFILE_PRIVACY_FIELDS)[keyof typeof PROFILE_PRIVACY_FIELDS];

export const PROFILE_PRIVACY_FIELD_META: Record<
  ProfilePrivacyFieldKey,
  ProfilePrivacyFieldMeta
> = {
  [PROFILE_PRIVACY_FIELDS.FULL_NAME]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.GENDER]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.DATE_OF_BIRTH]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.MARITAL_STATUS]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.DIVORCE_DETAILS]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.CHILDREN_COUNT]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.HEIGHT]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.WEIGHT]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.COMPLEXION]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.RELIGION]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.HAS_BEARD]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.PRAYER_PRACTICE]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.HIJAB_PRACTICE]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.SMOKING_HABIT]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.HAS_DISABILITY]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.DISABILITY_INFO]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.EDUCATION_MEDIUM]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.HIGHEST_DEGREE]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.ADDITIONAL_EDUCATION_QUALIFICATIONS]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.INSTITUTION]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.EDUCATION_YEAR]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.EDUCATION_SUBJECT]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.OCCUPATION]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.COMPANY]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.DESIGNATION]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.MONTHLY_INCOME]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.CURRENT_COUNTRY]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.CURRENT_DIVISION]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.CURRENT_DISTRICT]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.CURRENT_UPAZILA]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.CURRENT_CITY_TOWN]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.CURRENT_ADDRESS]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.PERMANENT_DIVISION]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.PERMANENT_COUNTRY]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.PERMANENT_DISTRICT]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.PERMANENT_UPAZILA]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.PERMANENT_CITY_TOWN]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.PERMANENT_ADDRESS]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.INTRODUCTION]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.BIOGRAPHY]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.HOBBIES]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.INTERESTS]: {
    section: ProfileFieldSection.PERSONAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.EXPECTED_MARRIAGE_TIMELINE]: {
    section: ProfileFieldSection.MARITAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.DOWRY_EXPECTATION]: {
    section: ProfileFieldSection.MARITAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.WEDDING_CEREMONY_PREFERENCE]: {
    section: ProfileFieldSection.MARITAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.EXPECTED_PARENTHOOD_TIMELINE]: {
    section: ProfileFieldSection.MARITAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.LIVING_ARRANGEMENTS]: {
    section: ProfileFieldSection.MARITAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.LIVING_ARRANGEMENTS_OTHER]: {
    section: ProfileFieldSection.MARITAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.EXPECTED_KABIN_AMOUNT_MIN_BDT]: {
    section: ProfileFieldSection.MARITAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.EXPECTED_KABIN_AMOUNT_MAX_BDT]: {
    section: ProfileFieldSection.MARITAL,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.FATHER_NAME]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.FATHER_IS_ALIVE]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.FATHER_EDUCATION]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.FATHER_PROFESSION]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.MOTHER_NAME]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.MOTHER_IS_ALIVE]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.MOTHER_EDUCATION]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.MOTHER_PROFESSION]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.FAMILY_TYPE]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.FAMILY_STATUS]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.FAMILY_VALUES]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.FAMILY_ASSETS]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
  [PROFILE_PRIVACY_FIELDS.SIBLINGS]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.PATERNAL_RELATIVES]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.MATERNAL_RELATIVES]: {
    section: ProfileFieldSection.FAMILY,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_AGE_RANGE]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_HEIGHT_RANGE]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_WEIGHT_RANGE]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_DISTRICTS]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_EDUCATION]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_PROFESSION]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_BEARD_PREFERENCE]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_PRAYER_PREFERENCE]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_HIJAB_PREFERENCE]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PROFILE_COMPATIBILITY,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_RELIGION]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_MARITAL_STATUS]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.PARTNER_NOTES]: {
    section: ProfileFieldSection.PARTNER,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.PRIMARY_PHOTO]: {
    section: ProfileFieldSection.MEDIA,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.GALLERY_PHOTOS]: {
    section: ProfileFieldSection.MEDIA,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
  },
  [PROFILE_PRIVACY_FIELDS.VERIFIED_BADGE]: {
    section: ProfileFieldSection.MEDIA,
    defaultShareable: true,
    defaultMinLevel: PrivacyLevel.PUBLIC,
  },
  [PROFILE_PRIVACY_FIELDS.PHONE]: {
    section: ProfileFieldSection.MEDIA,
    defaultShareable: false,
    defaultMinLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
  },
};

export function isFieldVisibleAtLevel(
  isShareable: boolean,
  minPrivacyLevel: number,
  viewerLevel: number,
): boolean {
  if (!isShareable) return false;
  // Cumulative disclosure: level N includes every field unlocked at levels 0..N.
  return viewerLevel >= minPrivacyLevel;
}

/** All privacy tiers unlocked for the viewer (0 through viewerLevel inclusive). */
export function unlockedPrivacyLevels(viewerLevel: number): number[] {
  const capped = Math.max(0, Math.min(3, viewerLevel));
  return Array.from({ length: capped + 1 }, (_, level) => level);
}

export function isFieldVisibleAtViewerLevel(
  isShareable: boolean,
  fieldLevel: number,
  viewerLevel: number,
): boolean {
  return isFieldVisibleAtLevel(isShareable, fieldLevel, viewerLevel);
}

export function resolveVisibleFullName(
  fullName: string | null | undefined,
  viewerPrivacyLevel: number,
  rule?: { isShareable: boolean; minPrivacyLevel: number } | null,
): string | null {
  const meta = PROFILE_PRIVACY_FIELD_META[PROFILE_PRIVACY_FIELDS.FULL_NAME];
  const isShareable = rule?.isShareable ?? meta.defaultShareable;
  const minPrivacyLevel = rule?.minPrivacyLevel ?? meta.defaultMinLevel;
  if (!isFieldVisibleAtLevel(isShareable, minPrivacyLevel, viewerPrivacyLevel)) {
    return null;
  }
  const trimmed = fullName?.trim();
  return trimmed || null;
}
