export type VerificationBiodataPersonalSnapshot = {
  fullName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
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
};

export type VerificationBiodataMaritalSnapshot = {
  expectedMarriageTimeline: string | null;
  dowryExpectation: string | null;
  weddingCeremonyPreference: string | null;
  expectedParenthoodTimeline: string | null;
  livingArrangements: string | null;
  livingArrangementsOther: string | null;
  expectedKabinAmountMinBdt: number | null;
  expectedKabinAmountMaxBdt: number | null;
};

export type VerificationBiodataFamilySnapshot = {
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
};

export type VerificationBiodataSiblingSnapshot = {
  relationship: string | null;
  name: string | null;
  education: string | null;
  profession: string | null;
  maritalStatus: string | null;
  spouseName: string | null;
  spouseEducation: string | null;
  spouseProfession: string | null;
};

export type VerificationBiodataRelativeSnapshot = {
  relation: string | null;
  name: string | null;
  education: string | null;
  profession: string | null;
};

export type VerificationBiodataPartnerSnapshot = {
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
};

export type VerificationBiodataSnapshot = {
  personal: VerificationBiodataPersonalSnapshot;
  marital: VerificationBiodataMaritalSnapshot;
  familyInfo: VerificationBiodataFamilySnapshot | null;
  siblings: VerificationBiodataSiblingSnapshot[];
  paternalRelatives: VerificationBiodataRelativeSnapshot[];
  maternalRelatives: VerificationBiodataRelativeSnapshot[];
  partnerPreference: VerificationBiodataPartnerSnapshot | null;
};

export type VerificationBiodataChanges = {
  hasBaseline: boolean;
  changedPaths: string[];
  previousSnapshot: VerificationBiodataSnapshot | null;
};

function normalizeComparable(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) {
    const normalized = value.map(normalizeComparable);
    if (
      normalized.every(
        (item) =>
          item === null ||
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean',
      )
    ) {
      return [...normalized].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true }),
      );
    }
    return normalized;
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeComparable(value));
}

function flattenObject(
  prefix: string,
  value: Record<string, unknown>,
  flat: Record<string, unknown>,
) {
  for (const [key, nested] of Object.entries(value)) {
    flat[`${prefix}.${key}`] = nested;
  }
}

export function flattenVerificationBiodataSnapshot(
  snapshot: VerificationBiodataSnapshot,
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  flattenObject('personal', snapshot.personal as Record<string, unknown>, flat);
  flattenObject('marital', snapshot.marital as Record<string, unknown>, flat);

  if (snapshot.familyInfo) {
    flattenObject(
      'familyInfo',
      snapshot.familyInfo as Record<string, unknown>,
      flat,
    );
  }

  flat['siblings.__length'] = snapshot.siblings.length;
  snapshot.siblings.forEach((sibling, index) => {
    flattenObject(
      `siblings.${index}`,
      sibling as Record<string, unknown>,
      flat,
    );
  });

  flat['paternalRelatives.__length'] = snapshot.paternalRelatives.length;
  snapshot.paternalRelatives.forEach((relative, index) => {
    flattenObject(
      `paternalRelatives.${index}`,
      relative as Record<string, unknown>,
      flat,
    );
  });

  flat['maternalRelatives.__length'] = snapshot.maternalRelatives.length;
  snapshot.maternalRelatives.forEach((relative, index) => {
    flattenObject(
      `maternalRelatives.${index}`,
      relative as Record<string, unknown>,
      flat,
    );
  });

  if (snapshot.partnerPreference) {
    flattenObject(
      'partnerPreference',
      snapshot.partnerPreference as Record<string, unknown>,
      flat,
    );
  }

  return flat;
}

export function diffVerificationBiodataSnapshots(
  current: VerificationBiodataSnapshot,
  previous: VerificationBiodataSnapshot | null | undefined,
): string[] {
  if (!previous) return [];

  const currentFlat = flattenVerificationBiodataSnapshot(current);
  const previousFlat = flattenVerificationBiodataSnapshot(previous);
  const keys = new Set([
    ...Object.keys(currentFlat),
    ...Object.keys(previousFlat),
  ]);

  const changed: string[] = [];
  for (const key of keys) {
    if (
      stableStringify(currentFlat[key]) !== stableStringify(previousFlat[key])
    ) {
      changed.push(key);
    }
  }

  return changed.sort();
}

export function getVerificationBiodataSnapshotValue(
  snapshot: VerificationBiodataSnapshot | null | undefined,
  path: string,
): unknown {
  if (!snapshot) return undefined;

  const parts = path.split('.');
  if (parts.length < 2) return undefined;

  const [section, ...rest] = parts;

  if (section === 'personal') {
    return snapshot.personal[rest[0] as keyof VerificationBiodataPersonalSnapshot];
  }
  if (section === 'marital') {
    return snapshot.marital[rest[0] as keyof VerificationBiodataMaritalSnapshot];
  }
  if (section === 'familyInfo') {
    return snapshot.familyInfo?.[
      rest[0] as keyof VerificationBiodataFamilySnapshot
    ];
  }
  if (section === 'partnerPreference') {
    return snapshot.partnerPreference?.[
      rest[0] as keyof VerificationBiodataPartnerSnapshot
    ];
  }

  const collectionMatch = section.match(/^(siblings|paternalRelatives|maternalRelatives)$/);
  if (collectionMatch && rest.length >= 2) {
    const index = Number(rest[0]);
    const field = rest[1];
    if (!Number.isInteger(index)) return undefined;
    const collection = snapshot[collectionMatch[1] as keyof VerificationBiodataSnapshot];
    if (!Array.isArray(collection)) return undefined;
    const item = collection[index] as Record<string, unknown> | undefined;
    return item?.[field];
  }

  return undefined;
}

export function buildVerificationBiodataChanges(
  current: VerificationBiodataSnapshot,
  previous: VerificationBiodataSnapshot | null | undefined,
): VerificationBiodataChanges {
  return {
    hasBaseline: previous != null,
    changedPaths: diffVerificationBiodataSnapshots(current, previous),
    previousSnapshot: previous ?? null,
  };
}

export function hasVerificationPathPrefix(
  changedPaths: string[],
  prefix: string,
): boolean {
  return changedPaths.some(
    (path) => path === prefix || path.startsWith(`${prefix}.`),
  );
}
