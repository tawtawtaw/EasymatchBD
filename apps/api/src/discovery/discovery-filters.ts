import type { Prisma } from '@prisma/client';
import { InterestStatus } from '@prisma/client';
import {
  FEMALE_GENDER_VALUE,
  getOppositeGender,
  isValidProfileCode,
  LEGAL_MARRIAGE_AGE_FEMALE,
  LEGAL_MARRIAGE_AGE_MALE,
  MALE_GENDER_VALUE,
  minMarriageAgeForGender,
  normalizeProfileCode,
  PROFILE_AGE_MAX,
} from '@easymatch/shared';

export type DiscoveryFilterInput = {
  profileCode?: string;
  gender?: string;
  division?: string;
  district?: string;
  maritalStatus?: string;
  religion?: string;
  complexion?: string;
  education?: string;
  occupation?: string;
  incomeRange?: string;
  ageMin?: number;
  ageMax?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  weightMinKg?: number;
  weightMaxKg?: number;
  hasDisability?: boolean;
  familyType?: string;
  familyStatus?: string;
};

function parseIntInRange(
  value: string | undefined,
  min: number,
  max: number,
): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - years);
  return date;
}

function listedGenderOf(
  where: Prisma.ProfileWhereInput,
  filters: DiscoveryFilterInput,
): string | undefined {
  if (typeof where.gender === 'string') return where.gender;
  return filters.gender;
}

function applyLegalAndRequestedAgeFilter(
  where: Prisma.ProfileWhereInput,
  filters: DiscoveryFilterInput,
) {
  const listedGender = listedGenderOf(where, filters);
  const userMax = filters.ageMax;

  if (listedGender === MALE_GENDER_VALUE || listedGender === FEMALE_GENDER_VALUE) {
    const legalMin = minMarriageAgeForGender(listedGender);
    const effectiveMin = Math.max(filters.ageMin ?? legalMin, legalMin);
    const dateOfBirth: Prisma.DateTimeFilter = { lte: yearsAgo(effectiveMin) };
    if (userMax != null) dateOfBirth.gte = yearsAgo(userMax);
    where.dateOfBirth = dateOfBirth;
    return;
  }

  const clauses: Prisma.ProfileWhereInput[] = [
    {
      OR: [
        {
          gender: FEMALE_GENDER_VALUE,
          dateOfBirth: { lte: yearsAgo(LEGAL_MARRIAGE_AGE_FEMALE) },
        },
        {
          gender: MALE_GENDER_VALUE,
          dateOfBirth: { lte: yearsAgo(LEGAL_MARRIAGE_AGE_MALE) },
        },
      ],
    },
  ];
  const requested: Prisma.DateTimeFilter = {};
  if (filters.ageMin != null) requested.lte = yearsAgo(filters.ageMin);
  if (userMax != null) requested.gte = yearsAgo(userMax);
  if (Object.keys(requested).length > 0) {
    clauses.push({ dateOfBirth: requested });
  }

  const existingAnd = where.AND
    ? Array.isArray(where.AND)
      ? where.AND
      : [where.AND]
    : [];
  where.AND = [...existingAnd, ...clauses];
}

export function parseDiscoveryFilters(
  query: Record<string, string | undefined>,
): DiscoveryFilterInput {
  const filters: DiscoveryFilterInput = {};

  const profileCode = query.profileCode?.trim();
  if (profileCode && isValidProfileCode(profileCode)) {
    filters.profileCode = normalizeProfileCode(profileCode);
  }

  const stringKeys = [
    'division',
    'district',
    'maritalStatus',
    'religion',
    'complexion',
    'education',
    'occupation',
    'incomeRange',
    'familyType',
    'familyStatus',
  ] as const;

  for (const key of stringKeys) {
    const value = query[key]?.trim();
    if (value) filters[key] = value;
  }

  filters.ageMin = parseIntInRange(
    query.ageMin,
    LEGAL_MARRIAGE_AGE_FEMALE,
    PROFILE_AGE_MAX,
  );
  filters.ageMax = parseIntInRange(
    query.ageMax,
    LEGAL_MARRIAGE_AGE_FEMALE,
    PROFILE_AGE_MAX,
  );
  filters.heightMinCm = parseIntInRange(query.heightMinCm, 100, 250);
  filters.heightMaxCm = parseIntInRange(query.heightMaxCm, 100, 250);
  filters.weightMinKg = parseIntInRange(query.weightMinKg, 30, 200);
  filters.weightMaxKg = parseIntInRange(query.weightMaxKg, 30, 200);

  if (query.hasDisability === 'true') filters.hasDisability = true;
  if (query.hasDisability === 'false') filters.hasDisability = false;

  const gender = query.gender?.trim().toLowerCase();
  if (gender === 'male' || gender === 'female') {
    filters.gender = gender;
  }

  return filters;
}

export function buildDiscoveryProfileWhere(
  viewerUserId: string,
  filters: DiscoveryFilterInput,
  viewerGender?: string | null,
): Prisma.ProfileWhereInput {
  const where: Prisma.ProfileWhereInput = {
    isVerified: true,
    isPaused: false,
    userId: { not: viewerUserId },
    user: {
      isActive: true,
      NOT: {
        OR: [
          {
            interestsReceived: {
              some: {
                senderId: viewerUserId,
                status: {
                  in: [InterestStatus.pending, InterestStatus.accepted],
                },
              },
            },
          },
          {
            connectionsAsLow: {
              some: { userHighId: viewerUserId, endedAt: null },
            },
          },
          {
            connectionsAsHigh: {
              some: { userLowId: viewerUserId, endedAt: null },
            },
          },
        ],
      },
    },
  };

  if (filters.profileCode) {
    where.profileCode = filters.profileCode;
  }

  const oppositeGender = getOppositeGender(viewerGender);
  if (oppositeGender) {
    where.gender = oppositeGender;
  }

  if (filters.division) where.currentDivision = filters.division;
  if (filters.district) where.currentDistrict = filters.district;
  if (filters.maritalStatus) where.maritalStatus = filters.maritalStatus;
  if (filters.religion) where.religion = filters.religion;
  if (filters.complexion) where.complexion = filters.complexion;
  if (filters.education) where.highestDegree = filters.education;
  if (filters.occupation) where.occupation = filters.occupation;
  if (filters.incomeRange) where.monthlyIncomeRange = filters.incomeRange;
  if (filters.hasDisability !== undefined) {
    where.hasDisability = filters.hasDisability;
  }

  applyLegalAndRequestedAgeFilter(where, filters);

  const heightCm: Prisma.IntFilter = {};
  if (filters.heightMinCm != null) heightCm.gte = filters.heightMinCm;
  if (filters.heightMaxCm != null) heightCm.lte = filters.heightMaxCm;
  if (Object.keys(heightCm).length > 0) where.heightCm = heightCm;

  const weightKg: Prisma.IntFilter = {};
  if (filters.weightMinKg != null) weightKg.gte = filters.weightMinKg;
  if (filters.weightMaxKg != null) weightKg.lte = filters.weightMaxKg;
  if (Object.keys(weightKg).length > 0) where.weightKg = weightKg;

  if (filters.familyType || filters.familyStatus) {
    where.familyInfo = {
      is: {
        ...(filters.familyType ? { familyType: filters.familyType } : {}),
        ...(filters.familyStatus ? { familyStatus: filters.familyStatus } : {}),
      },
    };
  }

  return where;
}

export function buildPublicBrowseProfileWhere(
  filters: DiscoveryFilterInput,
): Prisma.ProfileWhereInput {
  const where: Prisma.ProfileWhereInput = {
    isVerified: true,
    isPaused: false,
    user: { isActive: true },
  };

  if (filters.gender) {
    where.gender = filters.gender;
  }

  if (filters.profileCode) {
    where.profileCode = filters.profileCode;
  }

  if (filters.division) where.currentDivision = filters.division;
  if (filters.district) where.currentDistrict = filters.district;
  if (filters.maritalStatus) where.maritalStatus = filters.maritalStatus;
  if (filters.religion) where.religion = filters.religion;
  if (filters.complexion) where.complexion = filters.complexion;
  if (filters.education) where.highestDegree = filters.education;
  if (filters.occupation) where.occupation = filters.occupation;
  if (filters.incomeRange) where.monthlyIncomeRange = filters.incomeRange;
  if (filters.hasDisability !== undefined) {
    where.hasDisability = filters.hasDisability;
  }

  applyLegalAndRequestedAgeFilter(where, filters);

  const heightCm: Prisma.IntFilter = {};
  if (filters.heightMinCm != null) heightCm.gte = filters.heightMinCm;
  if (filters.heightMaxCm != null) heightCm.lte = filters.heightMaxCm;
  if (Object.keys(heightCm).length > 0) where.heightCm = heightCm;

  const weightKg: Prisma.IntFilter = {};
  if (filters.weightMinKg != null) weightKg.gte = filters.weightMinKg;
  if (filters.weightMaxKg != null) weightKg.lte = filters.weightMaxKg;
  if (Object.keys(weightKg).length > 0) where.weightKg = weightKg;

  if (filters.familyType || filters.familyStatus) {
    where.familyInfo = {
      is: {
        ...(filters.familyType ? { familyType: filters.familyType } : {}),
        ...(filters.familyStatus ? { familyStatus: filters.familyStatus } : {}),
      },
    };
  }

  return where;
}
