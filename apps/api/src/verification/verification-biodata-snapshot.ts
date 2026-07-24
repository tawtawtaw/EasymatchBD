import type { Prisma } from '@prisma/client';
import type { VerificationBiodataSnapshot } from '@easymatch/shared';

type ProfileWithBiodataRelations = {
  fullName: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  maritalStatus: string | null;
  divorceDetails: string | null;
  childrenCount: number | null;
  heightUnit: string | null;
  heightCm: number | null;
  weightKg: number | null;
  complexion: string | null;
  hasDisability: boolean;
  disabilityInfo: string | null;
  religion: string | null;
  hasBeard: string | null;
  prayerPractice: string | null;
  hijabPractice: string | null;
  smokingHabit: string | null;
  educationMedium: string | null;
  highestDegree: string | null;
  additionalEducationQualifications: string | null;
  institution: string | null;
  educationYear: number | null;
  educationSubject: string | null;
  occupation: string | null;
  company: string | null;
  designation: string | null;
  monthlyIncomeRange: string | null;
  currentCountry: string | null;
  currentDivision: string | null;
  currentDistrict: string | null;
  currentUpazila: string | null;
  currentCityTown: string | null;
  currentAddressLine: string | null;
  permanentCountry: string | null;
  permanentDivision: string | null;
  permanentDistrict: string | null;
  permanentUpazila: string | null;
  permanentCityTown: string | null;
  permanentAddressLine: string | null;
  permanentSameAsCurrent: boolean;
  biography: string | null;
  hobbies: string[];
  interests: string | null;
  introduction: string | null;
  expectedMarriageTimeline: string | null;
  dowryExpectation: string | null;
  weddingCeremonyPreference: string | null;
  expectedParenthoodTimeline: string | null;
  livingArrangements: string | null;
  livingArrangementsOther: string | null;
  expectedKabinAmountMinBdt: number | null;
  expectedKabinAmountMaxBdt: number | null;
  familyInfo: {
    fatherName: string | null;
    fatherIsAlive: string | null;
    fatherEducation: string | null;
    fatherProfession: string | null;
    motherName: string | null;
    motherIsAlive: string | null;
    motherEducation: string | null;
    motherProfession: string | null;
    familyType: string | null;
    familyStatus: string | null;
    familyValues: string | null;
    familyAssets: string | null;
  } | null;
  siblings: Array<{
    relationship: string | null;
    name: string | null;
    education: string | null;
    profession: string | null;
    maritalStatus: string | null;
    spouseName: string | null;
    spouseEducation: string | null;
    spouseProfession: string | null;
  }>;
  paternalRelatives: Array<{
    relation: string | null;
    name: string | null;
    education: string | null;
    profession: string | null;
  }>;
  maternalRelatives: Array<{
    relation: string | null;
    name: string | null;
    education: string | null;
    profession: string | null;
  }>;
  partnerPreference: {
    ageMin: number | null;
    ageMax: number | null;
    heightUnit: string | null;
    heightMinCm: number | null;
    heightMaxCm: number | null;
    weightMinKg: number | null;
    weightMaxKg: number | null;
    preferredDistricts: string[];
    minimumEducation: string | null;
    preferredProfession: string[];
    beardPreference: string | null;
    prayerPreference: string | null;
    hijabPreference: string | null;
    maritalStatusPref: string[];
    additionalNotes: string | null;
  } | null;
};

export function buildVerificationBiodataSnapshotFromProfile(
  profile: ProfileWithBiodataRelations,
): VerificationBiodataSnapshot {
  return {
    personal: {
      fullName: profile.fullName,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth?.toISOString() ?? null,
      maritalStatus: profile.maritalStatus,
      divorceDetails: profile.divorceDetails,
      childrenCount: profile.childrenCount,
      heightUnit: profile.heightUnit,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      complexion: profile.complexion,
      hasDisability: profile.hasDisability,
      disabilityInfo: profile.disabilityInfo,
      religion: profile.religion,
      hasBeard: profile.hasBeard,
      prayerPractice: profile.prayerPractice,
      hijabPractice: profile.hijabPractice,
      smokingHabit: profile.smokingHabit,
      educationMedium: profile.educationMedium,
      highestDegree: profile.highestDegree,
      additionalEducationQualifications:
        profile.additionalEducationQualifications,
      institution: profile.institution,
      educationYear: profile.educationYear,
      educationSubject: profile.educationSubject,
      occupation: profile.occupation,
      company: profile.company,
      designation: profile.designation,
      monthlyIncomeRange: profile.monthlyIncomeRange,
      currentCountry: profile.currentCountry,
      currentDivision: profile.currentDivision,
      currentDistrict: profile.currentDistrict,
      currentUpazila: profile.currentUpazila,
      currentCityTown: profile.currentCityTown,
      currentAddressLine: profile.currentAddressLine,
      permanentCountry: profile.permanentCountry,
      permanentDivision: profile.permanentDivision,
      permanentDistrict: profile.permanentDistrict,
      permanentUpazila: profile.permanentUpazila,
      permanentCityTown: profile.permanentCityTown,
      permanentAddressLine: profile.permanentAddressLine,
      permanentSameAsCurrent: profile.permanentSameAsCurrent,
      biography: profile.biography,
      hobbies: profile.hobbies ?? [],
      interests: profile.interests,
      introduction: profile.introduction,
    },
    marital: {
      expectedMarriageTimeline: profile.expectedMarriageTimeline,
      dowryExpectation: profile.dowryExpectation,
      weddingCeremonyPreference: profile.weddingCeremonyPreference,
      expectedParenthoodTimeline: profile.expectedParenthoodTimeline,
      livingArrangements: profile.livingArrangements,
      livingArrangementsOther: profile.livingArrangementsOther,
      expectedKabinAmountMinBdt: profile.expectedKabinAmountMinBdt,
      expectedKabinAmountMaxBdt: profile.expectedKabinAmountMaxBdt,
    },
    familyInfo: profile.familyInfo
      ? {
          fatherName: profile.familyInfo.fatherName,
          fatherIsAlive: profile.familyInfo.fatherIsAlive,
          fatherEducation: profile.familyInfo.fatherEducation,
          fatherProfession: profile.familyInfo.fatherProfession,
          motherName: profile.familyInfo.motherName,
          motherIsAlive: profile.familyInfo.motherIsAlive,
          motherEducation: profile.familyInfo.motherEducation,
          motherProfession: profile.familyInfo.motherProfession,
          familyType: profile.familyInfo.familyType,
          familyStatus: profile.familyInfo.familyStatus,
          familyValues: profile.familyInfo.familyValues,
          familyAssets: profile.familyInfo.familyAssets,
        }
      : null,
    siblings: profile.siblings.map((sibling) => ({
      relationship: sibling.relationship,
      name: sibling.name,
      education: sibling.education,
      profession: sibling.profession,
      maritalStatus: sibling.maritalStatus,
      spouseName: sibling.spouseName,
      spouseEducation: sibling.spouseEducation,
      spouseProfession: sibling.spouseProfession,
    })),
    paternalRelatives: profile.paternalRelatives.map((relative) => ({
      relation: relative.relation,
      name: relative.name,
      education: relative.education,
      profession: relative.profession,
    })),
    maternalRelatives: profile.maternalRelatives.map((relative) => ({
      relation: relative.relation,
      name: relative.name,
      education: relative.education,
      profession: relative.profession,
    })),
    partnerPreference: profile.partnerPreference
      ? {
          ageMin: profile.partnerPreference.ageMin,
          ageMax: profile.partnerPreference.ageMax,
          heightUnit: profile.partnerPreference.heightUnit,
          heightMinCm: profile.partnerPreference.heightMinCm,
          heightMaxCm: profile.partnerPreference.heightMaxCm,
          weightMinKg: profile.partnerPreference.weightMinKg,
          weightMaxKg: profile.partnerPreference.weightMaxKg,
          preferredDistricts: profile.partnerPreference.preferredDistricts ?? [],
          minimumEducation: profile.partnerPreference.minimumEducation,
          preferredProfession:
            profile.partnerPreference.preferredProfession ?? [],
          beardPreference: profile.partnerPreference.beardPreference,
          prayerPreference: profile.partnerPreference.prayerPreference,
          hijabPreference: profile.partnerPreference.hijabPreference,
          maritalStatusPref: profile.partnerPreference.maritalStatusPref ?? [],
          additionalNotes: profile.partnerPreference.additionalNotes,
        }
      : null,
  };
}

export function parseStoredVerificationBiodataSnapshot(
  value: Prisma.JsonValue | null | undefined,
): VerificationBiodataSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as VerificationBiodataSnapshot;
}
