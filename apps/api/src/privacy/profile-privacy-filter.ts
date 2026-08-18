import {
  isFieldVisibleAtLevel,
  PROFILE_PRIVACY_FIELDS,
  ProfilePrivacyFieldKey,
} from '@easymatch/shared';
import {
  MediaReviewStatus,
  ProfilePhotoType,
  type FamilyInfo,
  type NidDocument,
  type MaternalRelative,
  type PartnerPreference,
  type PaternalRelative,
  type Profile,
  type ProfilePhoto,
  type Sibling,
  type User,
} from '@prisma/client';

export type PrivacyRule = {
  fieldKey: string;
  isShareable: boolean;
  minPrivacyLevel: number;
};

export type VisibleProfileView = {
  personal: Record<string, unknown>;
  marital: Record<string, unknown> | null;
  family: Record<string, unknown> | null;
  siblings: Record<string, unknown>[] | null;
  paternalRelatives: Record<string, unknown>[] | null;
  maternalRelatives: Record<string, unknown>[] | null;
  partner: Record<string, unknown> | null;
  media: {
    primaryPhotoId: string | null;
    galleryPhotoIds: string[];
    isVerified: boolean;
    verifiedOnBehalf: boolean;
    memberNidVerified: boolean;
    phone: string | null;
  };
  visibleFieldKeys: string[];
  hiddenFieldCount: number;
};

type ProfilePayload = Profile & {
  user?: Pick<User, 'phone'>;
  familyInfo: FamilyInfo | null;
  siblings?: Sibling[];
  paternalRelatives?: PaternalRelative[];
  maternalRelatives?: MaternalRelative[];
  partnerPreference: PartnerPreference | null;
  photos?: ProfilePhoto[];
  nidDocuments?: NidDocument[];
};

export function buildVisibleProfileView(
  profile: ProfilePayload,
  rules: PrivacyRule[],
  viewerLevel: number,
  options?: { includeOwnerPhone?: boolean },
): VisibleProfileView {
  const ruleMap = new Map(rules.map((rule) => [rule.fieldKey, rule]));
  const visibleFieldKeys: string[] = [];
  let hiddenFieldCount = 0;
  const siblingsList = profile.siblings ?? [];
  const paternalRelativesList = profile.paternalRelatives ?? [];
  const maternalRelativesList = profile.maternalRelatives ?? [];
  const photosList = profile.photos ?? [];

  const isVisible = (fieldKey: ProfilePrivacyFieldKey) => {
    // Cumulative: viewer at level N sees every shareable field with minLevel <= N.
    const rule = ruleMap.get(fieldKey);
    if (!rule) return false;
    const visible = isFieldVisibleAtLevel(
      rule.isShareable,
      rule.minPrivacyLevel,
      viewerLevel,
    );
    if (visible) visibleFieldKeys.push(fieldKey);
    else hiddenFieldCount += 1;
    return visible;
  };

  const personal: Record<string, unknown> = {};
  const setPersonal = (key: ProfilePrivacyFieldKey, value: unknown) => {
    if (!isVisible(key)) return;
    if (value !== null && value !== undefined && value !== '') {
      personal[key] = value;
    }
  };

  setPersonal(PROFILE_PRIVACY_FIELDS.FULL_NAME, profile.fullName);
  setPersonal(PROFILE_PRIVACY_FIELDS.GENDER, profile.gender);
  setPersonal(
    PROFILE_PRIVACY_FIELDS.DATE_OF_BIRTH,
    profile.dateOfBirth?.toISOString() ?? null,
  );
  setPersonal(PROFILE_PRIVACY_FIELDS.MARITAL_STATUS, profile.maritalStatus);
  setPersonal(PROFILE_PRIVACY_FIELDS.DIVORCE_DETAILS, profile.divorceDetails);
  setPersonal(PROFILE_PRIVACY_FIELDS.CHILDREN_COUNT, profile.childrenCount);
  if (isVisible(PROFILE_PRIVACY_FIELDS.HEIGHT) && profile.heightCm) {
    personal.heightCm = profile.heightCm;
    personal.heightUnit = profile.heightUnit;
  }
  setPersonal(PROFILE_PRIVACY_FIELDS.WEIGHT, profile.weightKg);
  setPersonal(PROFILE_PRIVACY_FIELDS.COMPLEXION, profile.complexion);
  setPersonal(PROFILE_PRIVACY_FIELDS.RELIGION, profile.religion);
  setPersonal(PROFILE_PRIVACY_FIELDS.HAS_BEARD, profile.hasBeard);
  setPersonal(PROFILE_PRIVACY_FIELDS.PRAYER_PRACTICE, profile.prayerPractice);
  setPersonal(PROFILE_PRIVACY_FIELDS.HIJAB_PRACTICE, profile.hijabPractice);
  setPersonal(PROFILE_PRIVACY_FIELDS.SMOKING_HABIT, profile.smokingHabit);
  setPersonal(PROFILE_PRIVACY_FIELDS.HAS_DISABILITY, profile.hasDisability);
  setPersonal(PROFILE_PRIVACY_FIELDS.DISABILITY_INFO, profile.disabilityInfo);
  setPersonal(PROFILE_PRIVACY_FIELDS.EDUCATION_MEDIUM, profile.educationMedium);
  setPersonal(PROFILE_PRIVACY_FIELDS.HIGHEST_DEGREE, profile.highestDegree);
  setPersonal(
    PROFILE_PRIVACY_FIELDS.ADDITIONAL_EDUCATION_QUALIFICATIONS,
    profile.additionalEducationQualifications,
  );
  setPersonal(PROFILE_PRIVACY_FIELDS.INSTITUTION, profile.institution);
  setPersonal(PROFILE_PRIVACY_FIELDS.EDUCATION_YEAR, profile.educationYear);
  setPersonal(PROFILE_PRIVACY_FIELDS.EDUCATION_SUBJECT, profile.educationSubject);
  setPersonal(PROFILE_PRIVACY_FIELDS.OCCUPATION, profile.occupation);
  setPersonal(PROFILE_PRIVACY_FIELDS.COMPANY, profile.company);
  setPersonal(PROFILE_PRIVACY_FIELDS.DESIGNATION, profile.designation);
  setPersonal(
    PROFILE_PRIVACY_FIELDS.MONTHLY_INCOME,
    profile.monthlyIncomeRange,
  );
  setPersonal(PROFILE_PRIVACY_FIELDS.CURRENT_COUNTRY, profile.currentCountry);
  setPersonal(PROFILE_PRIVACY_FIELDS.CURRENT_DIVISION, profile.currentDivision);
  setPersonal(PROFILE_PRIVACY_FIELDS.CURRENT_DISTRICT, profile.currentDistrict);
  setPersonal(PROFILE_PRIVACY_FIELDS.CURRENT_UPAZILA, profile.currentUpazila);
  setPersonal(PROFILE_PRIVACY_FIELDS.CURRENT_CITY_TOWN, profile.currentCityTown);
  setPersonal(
    PROFILE_PRIVACY_FIELDS.CURRENT_ADDRESS,
    profile.currentAddressLine,
  );
  setPersonal(
    PROFILE_PRIVACY_FIELDS.PERMANENT_DIVISION,
    profile.permanentDivision,
  );
  setPersonal(
    PROFILE_PRIVACY_FIELDS.PERMANENT_COUNTRY,
    profile.permanentSameAsCurrent
      ? profile.currentCountry
      : profile.permanentCountry,
  );
  setPersonal(
    PROFILE_PRIVACY_FIELDS.PERMANENT_DISTRICT,
    profile.permanentDistrict,
  );
  setPersonal(
    PROFILE_PRIVACY_FIELDS.PERMANENT_UPAZILA,
    profile.permanentUpazila,
  );
  setPersonal(
    PROFILE_PRIVACY_FIELDS.PERMANENT_CITY_TOWN,
    profile.permanentCityTown,
  );
  setPersonal(
    PROFILE_PRIVACY_FIELDS.PERMANENT_ADDRESS,
    profile.permanentAddressLine,
  );
  setPersonal(PROFILE_PRIVACY_FIELDS.INTRODUCTION, profile.introduction);
  setPersonal(PROFILE_PRIVACY_FIELDS.BIOGRAPHY, profile.biography);
  if (
    isVisible(PROFILE_PRIVACY_FIELDS.HOBBIES) &&
    (profile.hobbies?.length ?? 0) > 0
  ) {
    personal.hobbies = profile.hobbies;
  }
  setPersonal(PROFILE_PRIVACY_FIELDS.INTERESTS, profile.interests);

  const marital: Record<string, unknown> = {};
  const setMarital = (key: ProfilePrivacyFieldKey, value: unknown) => {
    if (!isVisible(key)) return;
    if (value !== null && value !== undefined && value !== '') {
      marital[key] = value;
    }
  };
  setMarital(
    PROFILE_PRIVACY_FIELDS.EXPECTED_MARRIAGE_TIMELINE,
    profile.expectedMarriageTimeline,
  );
  setMarital(
    PROFILE_PRIVACY_FIELDS.DOWRY_EXPECTATION,
    profile.dowryExpectation,
  );
  setMarital(
    PROFILE_PRIVACY_FIELDS.WEDDING_CEREMONY_PREFERENCE,
    profile.weddingCeremonyPreference,
  );
  setMarital(
    PROFILE_PRIVACY_FIELDS.EXPECTED_PARENTHOOD_TIMELINE,
    profile.expectedParenthoodTimeline,
  );
  setMarital(
    PROFILE_PRIVACY_FIELDS.LIVING_ARRANGEMENTS,
    profile.livingArrangements,
  );
  setMarital(
    PROFILE_PRIVACY_FIELDS.LIVING_ARRANGEMENTS_OTHER,
    profile.livingArrangementsOther,
  );
  setMarital(
    PROFILE_PRIVACY_FIELDS.EXPECTED_KABIN_AMOUNT_MIN_BDT,
    profile.expectedKabinAmountMinBdt,
  );
  setMarital(
    PROFILE_PRIVACY_FIELDS.EXPECTED_KABIN_AMOUNT_MAX_BDT,
    profile.expectedKabinAmountMaxBdt,
  );

  let family: Record<string, unknown> | null = null;
  if (profile.familyInfo) {
    const familyData: Record<string, unknown> = {};
    const setFamily = (key: ProfilePrivacyFieldKey, value: unknown) => {
      if (!isVisible(key)) return;
      if (value !== null && value !== undefined && value !== '') {
        familyData[key] = value;
      }
    };
    setFamily(PROFILE_PRIVACY_FIELDS.FATHER_NAME, profile.familyInfo.fatherName);
    setFamily(
      PROFILE_PRIVACY_FIELDS.FATHER_IS_ALIVE,
      profile.familyInfo.fatherIsAlive,
    );
    setFamily(
      PROFILE_PRIVACY_FIELDS.FATHER_EDUCATION,
      profile.familyInfo.fatherEducation,
    );
    setFamily(
      PROFILE_PRIVACY_FIELDS.FATHER_PROFESSION,
      profile.familyInfo.fatherProfession,
    );
    setFamily(PROFILE_PRIVACY_FIELDS.MOTHER_NAME, profile.familyInfo.motherName);
    setFamily(
      PROFILE_PRIVACY_FIELDS.MOTHER_IS_ALIVE,
      profile.familyInfo.motherIsAlive,
    );
    setFamily(
      PROFILE_PRIVACY_FIELDS.MOTHER_EDUCATION,
      profile.familyInfo.motherEducation,
    );
    setFamily(
      PROFILE_PRIVACY_FIELDS.MOTHER_PROFESSION,
      profile.familyInfo.motherProfession,
    );
    setFamily(PROFILE_PRIVACY_FIELDS.FAMILY_TYPE, profile.familyInfo.familyType);
    setFamily(
      PROFILE_PRIVACY_FIELDS.FAMILY_STATUS,
      profile.familyInfo.familyStatus,
    );
    setFamily(
      PROFILE_PRIVACY_FIELDS.FAMILY_VALUES,
      profile.familyInfo.familyValues,
    );
    setFamily(
      PROFILE_PRIVACY_FIELDS.FAMILY_ASSETS,
      profile.familyInfo.familyAssets,
    );
    if (Object.keys(familyData).length > 0) family = familyData;
  }

  let siblings: Record<string, unknown>[] | null = null;
  if (
    isVisible(PROFILE_PRIVACY_FIELDS.SIBLINGS) &&
    siblingsList.length > 0
  ) {
    siblings = siblingsList.map((sibling) => {
      const row: Record<string, unknown> = {
        relationship: sibling.relationship,
        name: sibling.name,
        education: sibling.education,
        profession: sibling.profession,
        maritalStatus: sibling.maritalStatus,
      };
      if (sibling.maritalStatus === 'married') {
        if (sibling.spouseName) row.spouseName = sibling.spouseName;
        if (sibling.spouseEducation) row.spouseEducation = sibling.spouseEducation;
        if (sibling.spouseProfession) row.spouseProfession = sibling.spouseProfession;
      }
      return row;
    });
  }

  let paternalRelatives: Record<string, unknown>[] | null = null;
  if (
    isVisible(PROFILE_PRIVACY_FIELDS.PATERNAL_RELATIVES) &&
    paternalRelativesList.length > 0
  ) {
    paternalRelatives = paternalRelativesList.map((relative) => ({
      relation: relative.relation,
      name: relative.name,
      education: relative.education,
      profession: relative.profession,
    }));
  }

  let maternalRelatives: Record<string, unknown>[] | null = null;
  if (
    isVisible(PROFILE_PRIVACY_FIELDS.MATERNAL_RELATIVES) &&
    maternalRelativesList.length > 0
  ) {
    maternalRelatives = maternalRelativesList.map((relative) => ({
      relation: relative.relation,
      name: relative.name,
      education: relative.education,
      profession: relative.profession,
    }));
  }

  let partner: Record<string, unknown> | null = null;
  if (profile.partnerPreference) {
    const partnerData: Record<string, unknown> = {};
    const pref = profile.partnerPreference;
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_AGE_RANGE)) {
      if (pref.ageMin != null) partnerData.ageMin = pref.ageMin;
      if (pref.ageMax != null) partnerData.ageMax = pref.ageMax;
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_HEIGHT_RANGE)) {
      if (pref.heightMinCm != null) partnerData.heightMinCm = pref.heightMinCm;
      if (pref.heightMaxCm != null) partnerData.heightMaxCm = pref.heightMaxCm;
      partnerData.heightUnit = pref.heightUnit;
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_WEIGHT_RANGE)) {
      if (pref.weightMinKg != null) partnerData.weightMinKg = pref.weightMinKg;
      if (pref.weightMaxKg != null) partnerData.weightMaxKg = pref.weightMaxKg;
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_DISTRICTS)) {
      partnerData.preferredDistricts = pref.preferredDistricts;
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_EDUCATION)) {
      partnerData.minimumEducation = pref.minimumEducation;
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_PROFESSION)) {
      if ((pref.preferredProfession?.length ?? 0) > 0) {
        partnerData.preferredProfession = pref.preferredProfession;
      }
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_RELIGION)) {
      partnerData.preferredReligion = pref.preferredReligion;
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_BEARD_PREFERENCE)) {
      partnerData.beardPreference = pref.beardPreference;
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_PRAYER_PREFERENCE)) {
      partnerData.prayerPreference = pref.prayerPreference;
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_HIJAB_PREFERENCE)) {
      partnerData.hijabPreference = pref.hijabPreference;
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_MARITAL_STATUS)) {
      if ((pref.maritalStatusPref?.length ?? 0) > 0) {
        partnerData.maritalStatusPref = pref.maritalStatusPref;
      }
    }
    if (isVisible(PROFILE_PRIVACY_FIELDS.PARTNER_NOTES)) {
      partnerData.additionalNotes = pref.additionalNotes;
    }
    if (Object.keys(partnerData).length > 0) partner = partnerData;
  }

  const approvedPhotos = photosList.filter(
    (photo) => photo.status === MediaReviewStatus.approved,
  );
  const primary = approvedPhotos.find(
    (photo) => photo.type === ProfilePhotoType.primary,
  );
  const media = {
    primaryPhotoId:
      isVisible(PROFILE_PRIVACY_FIELDS.PRIMARY_PHOTO) && primary
        ? primary.id
        : null,
    galleryPhotoIds: isVisible(PROFILE_PRIVACY_FIELDS.GALLERY_PHOTOS)
      ? approvedPhotos
          .filter((photo) => photo.type === ProfilePhotoType.gallery)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((photo) => photo.id)
      : [],
    isVerified:
      isVisible(PROFILE_PRIVACY_FIELDS.VERIFIED_BADGE) && profile.isVerified,
    verifiedOnBehalf:
      isVisible(PROFILE_PRIVACY_FIELDS.VERIFIED_BADGE) &&
      profile.isVerified &&
      profile.verifiedOnBehalf,
    memberNidVerified:
      isVisible(PROFILE_PRIVACY_FIELDS.VERIFIED_BADGE) &&
      profile.isVerified &&
      profile.verifiedOnBehalf &&
      profile.nidVerifiedAt != null,
    // Login phone is never shared with connections or public viewers.
    phone: options?.includeOwnerPhone
      ? isVisible(PROFILE_PRIVACY_FIELDS.PHONE)
        ? (profile.user?.phone ?? null)
        : null
      : null,
  };

  return {
    personal,
    marital: Object.keys(marital).length > 0 ? marital : null,
    family,
    siblings,
    paternalRelatives,
    maternalRelatives,
    partner,
    media,
    visibleFieldKeys,
    hiddenFieldCount,
  };
}
