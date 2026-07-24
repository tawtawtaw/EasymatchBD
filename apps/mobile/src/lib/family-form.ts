import type {
  FamilyFormState,
  FamilyInfo,
  MemberProfile,
  RelativeFormEntry,
  SiblingFormEntry,
} from "../types/profile";

export function emptySiblingEntry(): SiblingFormEntry {
  return {
    relationship: "",
    name: "",
    education: "",
    profession: "",
    maritalStatus: "",
    spouseName: "",
    spouseEducation: "",
    spouseProfession: "",
  };
}

export function emptyRelativeEntry(): RelativeFormEntry {
  return {
    relation: "",
    name: "",
    education: "",
    profession: "",
  };
}

export function emptyFamilyForm(): FamilyFormState {
  return {
    fatherName: "",
    fatherIsAlive: "",
    fatherEducation: "",
    fatherProfession: "",
    motherName: "",
    motherIsAlive: "",
    motherEducation: "",
    motherProfession: "",
    familyType: "",
    familyStatus: "",
    familyValues: "",
    familyAssets: "",
    siblings: [],
    paternalRelatives: [],
    maternalRelatives: [],
  };
}

function siblingFromApi(entry: Partial<SiblingFormEntry>): SiblingFormEntry {
  return {
    relationship: entry.relationship ?? "",
    name: entry.name ?? "",
    education: entry.education ?? "",
    profession: entry.profession ?? "",
    maritalStatus: entry.maritalStatus ?? "",
    spouseName: entry.spouseName ?? "",
    spouseEducation: entry.spouseEducation ?? "",
    spouseProfession: entry.spouseProfession ?? "",
  };
}

function relativeFromApi(entry: Partial<RelativeFormEntry>): RelativeFormEntry {
  return {
    relation: entry.relation ?? "",
    name: entry.name ?? "",
    education: entry.education ?? "",
    profession: entry.profession ?? "",
  };
}

export function profileToFamilyForm(
  family: FamilyInfo | null | undefined,
  siblings: Partial<SiblingFormEntry>[] | null | undefined,
  paternalRelatives: Partial<RelativeFormEntry>[] | null | undefined,
  maternalRelatives: Partial<RelativeFormEntry>[] | null | undefined,
): FamilyFormState {
  return {
    fatherName: family?.fatherName ?? "",
    fatherIsAlive: family?.fatherIsAlive ?? "",
    fatherEducation: family?.fatherEducation ?? "",
    fatherProfession: family?.fatherProfession ?? "",
    motherName: family?.motherName ?? "",
    motherIsAlive: family?.motherIsAlive ?? "",
    motherEducation: family?.motherEducation ?? "",
    motherProfession: family?.motherProfession ?? "",
    familyType: family?.familyType ?? "",
    familyStatus: family?.familyStatus ?? "",
    familyValues: family?.familyValues ?? "",
    familyAssets: family?.familyAssets ?? "",
    siblings: (siblings ?? []).map(siblingFromApi),
    paternalRelatives: (paternalRelatives ?? []).map(relativeFromApi),
    maternalRelatives: (maternalRelatives ?? []).map(relativeFromApi),
  };
}

function toSiblingPayload(entry: SiblingFormEntry) {
  return {
    relationship: entry.relationship || undefined,
    name: entry.name.trim() || undefined,
    education: entry.education || undefined,
    profession: entry.profession || undefined,
    maritalStatus: entry.maritalStatus || undefined,
    spouseName: entry.spouseName.trim() || undefined,
    spouseEducation: entry.spouseEducation || undefined,
    spouseProfession: entry.spouseProfession || undefined,
  };
}

function toRelativePayload(entry: RelativeFormEntry) {
  return {
    relation: entry.relation || undefined,
    name: entry.name.trim() || undefined,
    education: entry.education || undefined,
    profession: entry.profession || undefined,
  };
}

function hasRelativeData(entry: RelativeFormEntry) {
  return Boolean(
    entry.relation || entry.name.trim() || entry.education || entry.profession,
  );
}

export function buildUpdateFamilyPayload(form: FamilyFormState) {
  return {
    fatherName: form.fatherName.trim() || undefined,
    fatherIsAlive: form.fatherIsAlive || undefined,
    fatherEducation: form.fatherEducation || undefined,
    fatherProfession: form.fatherProfession || undefined,
    motherName: form.motherName.trim() || undefined,
    motherIsAlive: form.motherIsAlive || undefined,
    motherEducation: form.motherEducation || undefined,
    motherProfession: form.motherProfession || undefined,
    familyType: form.familyType || undefined,
    familyStatus: form.familyStatus || undefined,
    familyValues: form.familyValues.trim() || undefined,
    familyAssets: form.familyAssets.trim() || undefined,
    siblings: form.siblings.map(toSiblingPayload),
    paternalRelatives: form.paternalRelatives
      .filter(hasRelativeData)
      .map(toRelativePayload),
    maternalRelatives: form.maternalRelatives
      .filter(hasRelativeData)
      .map(toRelativePayload),
  };
}

export function readFamilyFromProfile(profile: MemberProfile): FamilyFormState {
  return profileToFamilyForm(
    profile.familyInfo,
    profile.siblings,
    profile.paternalRelatives,
    profile.maternalRelatives,
  );
}

export function isSiblingMarried(maritalStatus: string) {
  return maritalStatus === "married";
}
