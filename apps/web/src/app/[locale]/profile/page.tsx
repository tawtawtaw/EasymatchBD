"use client";

import {
  cmToFeetInches,
  BEARD_PREFERENCE_VALUES,
  displayDateToIso,
  formatDisplayDateInput,
  HAS_BEARD_VALUES,
  HIJAB_PRACTICE_VALUES,
  HIJAB_PREFERENCE_VALUES,
  memberAgeError,
  minMarriageAgeForPartnerPreference,
  normalizeHijabPreference,
  isIslamReligion,
  isStaffRole,
  isDivorcedMaritalStatus,
  requiresChildrenCountMaritalStatus,
  sanitizeChildrenCountInput,
  IS_ALIVE_VALUES,
  isoDateToDisplay,
  MATERNAL_RELATIVE_RELATIONS,
  PATERNAL_RELATIVE_RELATIONS,
  PRAYER_PREFERENCE_VALUES,
  PRAYER_PRACTICE_VALUES,
  showBeardPreferenceField,
  showHasBeardField,
  showHijabPracticeField,
  showSmokingHabitField,
  SMOKING_HABIT_VALUES,
  showDowryExpectationField,
  showLivingArrangementsOtherField,
  LIVING_ARRANGEMENTS_OTHER_MALE_VALUE,
  isExpectedKabinAmountInputValid,
  isValidExpectedKabinAmountRange,
  parseExpectedKabinAmountInput,
  showHijabPreferenceField,
  showPrayerPreferenceField,
} from "@easymatch/shared";
import { StaffProfileForm } from "@/components/StaffProfileForm";
import { ProfileAccountStatusPanel } from "@/components/ProfileAccountStatusPanel";
import { ProfilePausedBanner } from "@/components/ProfilePausedBanner";
import {
  PROFILE_ACCOUNT_STATUS_SECTION_ID,
  scrollToProfileAccountStatus,
} from "@/lib/profile-pause";
import { TermsAcceptanceGate } from "@/components/TermsAcceptanceGate";
import { TermsDeclinedView } from "@/components/TermsDeclinedView";
import { MemberAddressFields } from "@/components/MemberAddressFields";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { useAuthSession } from "@/hooks/use-auth-session";
import { AgeField } from "@/components/AgeField";
import { HeightField, HeightRangeField } from "@/components/HeightField";
import { ProfileMediaTab } from "@/components/ProfileMediaTab";
import { MaritalInformationTab, type MaritalFormState } from "@/components/MaritalInformationTab";
import { ProfileCreationIntent } from "@/components/ProfileCreationIntent";
import { VerificationFeedbackPanel } from "@/components/VerificationFeedbackPanel";
import { WeightField } from "@/components/WeightField";
import { FieldLabel } from "@/components/FieldLabel";
import {
  DistrictMultiSelectField,
  DistrictSelectField,
} from "@/components/DistrictFields";
import { DropdownMultiSelectField } from "@/components/DropdownMultiSelectField";
import { isAgeInputValid } from "@/lib/age";
import { Link, useRouter } from "@/i18n/routing";
import { getWeightInputError, isWeightInputValid } from "@/lib/weight";
import {
  AUTH_TOKEN_KEY,
  DropdownMap,
  getDropdowns,
  getMyProfile,
  getProfileEditorBootstrap,
  Profile,
  StaffProfile,
  Sibling,
  FamilyRelative,
  updateFamily,
  updateMarital,
  updatePartner,
  updatePersonal,
} from "@/lib/api";
import { phoneTelHref } from "@/lib/about-company";
import {
  dismissVerificationAlerts,
  getVerificationFeedback,
  type ProfileMedia,
  type VerificationFeedback,
} from "@/lib/media";
import {
  applyMediaCompletionOverrides,
  isBiodataCompleteFromMissing,
} from "@/lib/verification-submit-state";
import { markProfileAmendmentDirty } from "@/lib/profile-amendment";

type Tab = "personal" | "family" | "marital" | "partner" | "photos";

const PROFILE_TABS: Tab[] = ["personal", "family", "marital", "partner", "photos"];

function toSiblingInput(sibling: Sibling) {
  return {
    relationship: sibling.relationship || undefined,
    name: sibling.name || undefined,
    education: sibling.education || undefined,
    profession: sibling.profession || undefined,
    maritalStatus: sibling.maritalStatus || undefined,
    spouseName: sibling.spouseName || undefined,
    spouseEducation: sibling.spouseEducation || undefined,
    spouseProfession: sibling.spouseProfession || undefined,
  };
}

function isSiblingMarried(maritalStatus?: string) {
  return maritalStatus === "married";
}

function toRelativeInput(relative: FamilyRelative) {
  return {
    relation: relative.relation || undefined,
    name: relative.name || undefined,
    education: relative.education || undefined,
    profession: relative.profession || undefined,
  };
}

function relativeRelationOptions(
  side: "paternal" | "maternal",
  tf: ReturnType<typeof useTranslations<"profile.fields">>,
) {
  const values =
    side === "paternal"
      ? PATERNAL_RELATIVE_RELATIONS
      : MATERNAL_RELATIVE_RELATIONS;
  const group =
    side === "paternal"
      ? "paternalRelativeRelationOptions"
      : "maternalRelativeRelationOptions";

  return values.map((value) => ({
    value,
    label: tf(`${group}.${value}` as never),
  }));
}

function FamilySection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-zinc-950">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  allowCustom,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allowCustom?: boolean;
  required?: boolean;
}) {
  const tc = useTranslations("common");
  const hasOtherOption = options.some((o) => o.value === "other");
  const isCustomText =
    Boolean(value) && !options.some((o) => o.value === value);

  const [customMode, setCustomMode] = useState(
    () => isCustomText || value === "other",
  );

  useEffect(() => {
    if (isCustomText || value === "other") {
      setCustomMode(true);
    } else if (value && options.some((o) => o.value === value)) {
      setCustomMode(false);
    }
  }, [value, options, isCustomText]);

  const showCustomInput = Boolean(allowCustom) && (customMode || isCustomText);
  const selectValue =
    customMode || isCustomText
      ? hasOtherOption
        ? "other"
        : "__custom__"
      : value;
  const customInputValue = isCustomText ? value : "";

  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        value={selectValue}
        required={required}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "__custom__" || next === "other") {
            setCustomMode(true);
            onChange("");
          } else if (next === "") {
            setCustomMode(false);
            onChange("");
          } else {
            setCustomMode(false);
            onChange(next);
          }
        }}
        className="field-input"
      >
        <option value="">{tc("select")}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {allowCustom && !hasOtherOption && (
          <option value="__custom__">{tc("other")}</option>
        )}
      </select>
      {showCustomInput && (
        <input
          value={customInputValue}
          onChange={(e) => {
            setCustomMode(true);
            onChange(e.target.value);
          }}
          placeholder={tc("customValue")}
          className="field-input mt-1"
        />
      )}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
  required,
  disabled,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "numeric" | "text" | "decimal" | "tel" | "search" | "email" | "url";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="field-input disabled:cursor-not-allowed disabled:bg-zinc-100"
      />
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  required,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </label>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("profile");
  const tf = useTranslations("profile.fields");
  const ts = useTranslations("profile.sections");
  const tt = useTranslations("profile.tabs");
  const tc = useTranslations("common");
  const te = useTranslations("profile.errors");

  function getTabValidationError(): string | null {
    if (tab === "personal") {
      const isoDob = displayDateToIso(personal.dateOfBirth);
      if (isoDob) {
        const ageError = memberAgeError(isoDob, personal.gender);
        if (ageError === "too_young") return te("dateOfBirthTooYoung");
        if (ageError === "too_old" || ageError === "invalid") {
          return te("dateOfBirthTooOld");
        }
      }
      if (
        isIslamReligion(personal.religion) &&
        !personal.prayerPractice.trim()
      ) {
        return te("prayerPracticeRequired");
      }
      if (requiresChildrenCountMaritalStatus(personal.maritalStatus)) {
        if (!personal.childrenCount.trim()) {
          return te("childrenCountRequired");
        }
        if (!/^\d+$/.test(personal.childrenCount)) {
          return te("childrenCountInvalid");
        }
        if (Number(personal.childrenCount) > 20) {
          return te("childrenCountMax");
        }
      }
      if (showSmokingHabitField(personal.gender) && !personal.smokingHabit.trim()) {
        return te("smokingHabitRequired");
      }
      return getWeightInputError(personal.weightKg, {
        invalid: te("invalidWeight"),
        range: te("weightRange"),
      });
    }
    if (tab === "partner") {
      const partnerMin = minMarriageAgeForPartnerPreference(personal.gender);
      if (
        !isAgeInputValid(partner.ageMin, { min: partnerMin }) ||
        !isAgeInputValid(partner.ageMax, { min: partnerMin }) ||
        !isWeightInputValid(partner.weightMinKg) ||
        !isWeightInputValid(partner.weightMaxKg)
      ) {
        return te("fixPartnerFields");
      }
    }
    if (tab === "marital") {
      if (
        !isExpectedKabinAmountInputValid(marital.expectedKabinAmountMinBdt) ||
        !isExpectedKabinAmountInputValid(marital.expectedKabinAmountMaxBdt)
      ) {
        return te("expectedKabinAmountInvalid");
      }
      const kabinMin = parseExpectedKabinAmountInput(
        marital.expectedKabinAmountMinBdt,
      );
      const kabinMax = parseExpectedKabinAmountInput(
        marital.expectedKabinAmountMaxBdt,
      );
      if (kabinMin === undefined || kabinMax === undefined) {
        return te("expectedKabinAmountInvalid");
      }
      if (!isValidExpectedKabinAmountRange(kabinMin, kabinMax)) {
        return te("expectedKabinAmountRange");
      }
    }
    return null;
  }

  const mounted = useMounted();
  const { user: authSession } = useAuthSession();
  const [profilePaused, setProfilePaused] = useState(false);
  const [profilePausedAt, setProfilePausedAt] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loginPhone, setLoginPhone] = useState<string | null>(null);
  const [staffBootstrap, setStaffBootstrap] = useState<{
    dropdowns: DropdownMap;
    profile: StaffProfile;
  } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [currentTermsVersion, setCurrentTermsVersion] = useState<string>("");
  const [previousTermsVersion, setPreviousTermsVersion] = useState<string | null>(null);
  const [termsDeclined, setTermsDeclined] = useState(false);
  const [tab, setTab] = useState<Tab>("personal");
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const hasBeardOptions = useMemo(() => {
    if (dropdowns.has_beard?.length) return dropdowns.has_beard;
    return HAS_BEARD_VALUES.map((value) => ({
      value,
      label: tf(`hasBeardOptions.${value}`),
    }));
  }, [dropdowns.has_beard, tf]);

  const smokingHabitOptions = useMemo(() => {
    if (dropdowns.smoking_habit?.length) return dropdowns.smoking_habit;
    return SMOKING_HABIT_VALUES.map((value) => ({
      value,
      label: tf(`smokingHabitOptions.${value}`),
    }));
  }, [dropdowns.smoking_habit, tf]);

  const prayerPracticeOptions = useMemo(() => {
    if (dropdowns.prayer_practice?.length) return dropdowns.prayer_practice;
    return PRAYER_PRACTICE_VALUES.map((value) => ({
      value,
      label: tf(`prayerPracticeOptions.${value}`),
    }));
  }, [dropdowns.prayer_practice, tf]);

  const isAliveOptions = useMemo(() => {
    if (dropdowns.is_alive?.length) return dropdowns.is_alive;
    return IS_ALIVE_VALUES.map((value) => ({
      value,
      label: tf(`isAliveOptions.${value}`),
    }));
  }, [dropdowns.is_alive, tf]);

  const beardPreferenceOptions = useMemo(() => {
    if (dropdowns.beard_preference?.length) return dropdowns.beard_preference;
    return BEARD_PREFERENCE_VALUES.map((value) => ({
      value,
      label: tf(`beardPreferenceOptions.${value}`),
    }));
  }, [dropdowns.beard_preference, tf]);

  const prayerPreferenceOptions = useMemo(() => {
    if (dropdowns.prayer_preference?.length) return dropdowns.prayer_preference;
    return PRAYER_PREFERENCE_VALUES.map((value) => ({
      value,
      label: tf(`prayerPreferenceOptions.${value}`),
    }));
  }, [dropdowns.prayer_preference, tf]);

  const hijabPracticeOptions = useMemo(() => {
    if (dropdowns.hijab_practice?.length) return dropdowns.hijab_practice;
    return HIJAB_PRACTICE_VALUES.map((value) => ({
      value,
      label: tf(`hijabPracticeOptions.${value}`),
    }));
  }, [dropdowns.hijab_practice, tf]);

  const hijabPreferenceOptions = useMemo(() => {
    if (dropdowns.hijab_preference?.length) return dropdowns.hijab_preference;
    return HIJAB_PREFERENCE_VALUES.map((value) => ({
      value,
      label: tf(`hijabPreferenceOptions.${value}`),
    }));
  }, [dropdowns.hijab_preference, tf]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [liveMedia, setLiveMedia] = useState<ProfileMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] =
    useState<VerificationFeedback | null>(null);
  const [dismissingAlerts, setDismissingAlerts] = useState(false);

  const [personal, setPersonal] = useState({
    fullName: "",
    gender: "",
    dateOfBirth: "",
    maritalStatus: "",
    divorceDetails: "",
    childrenCount: "",
    heightFeet: "",
    heightInches: "",
    weightKg: "",
    complexion: "",
    hasDisability: false,
    disabilityInfo: "",
    religion: "",
    hasBeard: "",
    smokingHabit: "",
    prayerPractice: "",
    hijabPractice: "",
    highestDegree: "",
    educationMedium: "",
    additionalEducationQualifications: "",
    institution: "",
    educationYear: "",
    educationSubject: "",
    occupation: "",
    company: "",
    designation: "",
    monthlyIncomeRange: "",
    currentCountry: "Bangladesh",
    currentDivision: "",
    currentDistrict: "",
    currentUpazila: "",
    currentCityTown: "",
    currentAddressLine: "",
    permanentCountry: "Bangladesh",
    permanentDivision: "",
    permanentDistrict: "",
    permanentUpazila: "",
    permanentCityTown: "",
    permanentAddressLine: "",
    permanentSameAsCurrent: false,
    biography: "",
    hobbies: "",
    interests: "",
    introduction: "",
  });

  const [family, setFamily] = useState({
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
    siblings: [] as Sibling[],
    paternalRelatives: [] as FamilyRelative[],
    maternalRelatives: [] as FamilyRelative[],
  });

  const [marital, setMarital] = useState<MaritalFormState>({
    expectedMarriageTimeline: "",
    dowryExpectation: "",
    weddingCeremonyPreference: "",
    expectedParenthoodTimeline: "",
    livingArrangements: "",
    livingArrangementsOther: "",
    expectedKabinAmountMinBdt: "",
    expectedKabinAmountMaxBdt: "",
  });

  const [partner, setPartner] = useState({
    ageMin: "",
    ageMax: "",
    heightMinFeet: "",
    heightMinInches: "",
    heightMaxFeet: "",
    heightMaxInches: "",
    weightMinKg: "",
    weightMaxKg: "",
    preferredDistricts: [] as string[],
    minimumEducation: "",
    preferredProfession: [] as string[],
    beardPreference: "",
    prayerPreference: "",
    hijabPreference: "",
    maritalStatusPref: [] as string[],
    additionalNotes: "",
  });

  const applyLoadedProfile = useCallback(
    (
      dd: DropdownMap,
      p: Profile,
      feedback: VerificationFeedback | null,
    ) => {
      setDropdowns(dd);
      setProfile(p);
      setVerificationFeedback(feedback);

      setPersonal({
      fullName: p.fullName ?? "",
      gender: p.gender ?? "",
      dateOfBirth: isoDateToDisplay(p.dateOfBirth),
      maritalStatus: p.maritalStatus ?? "",
      divorceDetails: p.divorceDetails ?? "",
      childrenCount: p.childrenCount?.toString() ?? "",
      heightFeet: p.heightCm ? String(cmToFeetInches(p.heightCm).feet) : "",
      heightInches: p.heightCm ? String(cmToFeetInches(p.heightCm).inches) : "",
      weightKg: p.weightKg?.toString() ?? "",
      complexion: p.complexion ?? "",
      hasDisability: p.hasDisability,
      disabilityInfo: p.disabilityInfo ?? "",
      religion: p.religion ?? "",
      hasBeard: p.hasBeard ?? "",
      smokingHabit: p.smokingHabit ?? "",
      prayerPractice: p.prayerPractice ?? "",
      hijabPractice: p.hijabPractice ?? "",
      highestDegree: p.highestDegree ?? "",
      educationMedium: p.educationMedium ?? "",
      additionalEducationQualifications:
        p.additionalEducationQualifications ?? "",
      institution: p.institution ?? "",
      educationYear: p.educationYear?.toString() ?? "",
      educationSubject: p.educationSubject ?? "",
      occupation: p.occupation ?? "",
      company: p.company ?? "",
      designation: p.designation ?? "",
      monthlyIncomeRange: p.monthlyIncomeRange ?? "",
      currentCountry: p.currentCountry ?? "Bangladesh",
      currentDivision: p.currentDivision ?? "",
      currentDistrict: p.currentDistrict ?? "",
      currentUpazila: p.currentUpazila ?? "",
      currentCityTown: p.currentCityTown ?? "",
      currentAddressLine: p.currentAddressLine ?? "",
      permanentCountry: p.permanentCountry ?? "Bangladesh",
      permanentDivision: p.permanentDivision ?? "",
      permanentDistrict: p.permanentDistrict ?? "",
      permanentUpazila: p.permanentUpazila ?? "",
      permanentCityTown: p.permanentCityTown ?? "",
      permanentAddressLine: p.permanentAddressLine ?? "",
      permanentSameAsCurrent: p.permanentSameAsCurrent ?? false,
      biography: p.biography ?? "",
      hobbies: p.hobbies?.join(", ") ?? "",
      interests: p.interests ?? "",
      introduction: p.introduction ?? "",
    });

    setFamily({
      fatherName: p.familyInfo?.fatherName ?? "",
      fatherIsAlive: p.familyInfo?.fatherIsAlive ?? "",
      fatherEducation: p.familyInfo?.fatherEducation ?? "",
      fatherProfession: p.familyInfo?.fatherProfession ?? "",
      motherName: p.familyInfo?.motherName ?? "",
      motherIsAlive: p.familyInfo?.motherIsAlive ?? "",
      motherEducation: p.familyInfo?.motherEducation ?? "",
      motherProfession: p.familyInfo?.motherProfession ?? "",
      familyType: p.familyInfo?.familyType ?? "",
      familyStatus: p.familyInfo?.familyStatus ?? "",
      familyValues: p.familyInfo?.familyValues ?? "",
      familyAssets: p.familyInfo?.familyAssets ?? "",
      siblings: (p.siblings ?? []).map((sibling) => toSiblingInput(sibling)),
      paternalRelatives: (p.paternalRelatives ?? []).map((relative) =>
        toRelativeInput(relative),
      ),
      maternalRelatives: (p.maternalRelatives ?? []).map((relative) =>
        toRelativeInput(relative),
      ),
    });

    setMarital({
      expectedMarriageTimeline: p.expectedMarriageTimeline ?? "",
      dowryExpectation: p.dowryExpectation ?? "",
      weddingCeremonyPreference: p.weddingCeremonyPreference ?? "",
      expectedParenthoodTimeline: p.expectedParenthoodTimeline ?? "",
      livingArrangements: p.livingArrangements ?? "",
      livingArrangementsOther: p.livingArrangementsOther ?? "",
      expectedKabinAmountMinBdt:
        p.expectedKabinAmountMinBdt != null
          ? String(p.expectedKabinAmountMinBdt)
          : "",
      expectedKabinAmountMaxBdt:
        p.expectedKabinAmountMaxBdt != null
          ? String(p.expectedKabinAmountMaxBdt)
          : "",
    });

    setPartner({
      ageMin: p.partnerPreference?.ageMin?.toString() ?? "",
      ageMax: p.partnerPreference?.ageMax?.toString() ?? "",
      heightMinFeet: p.partnerPreference?.heightMinCm
        ? String(cmToFeetInches(p.partnerPreference.heightMinCm).feet)
        : "",
      heightMinInches: p.partnerPreference?.heightMinCm
        ? String(cmToFeetInches(p.partnerPreference.heightMinCm).inches)
        : "",
      heightMaxFeet: p.partnerPreference?.heightMaxCm
        ? String(cmToFeetInches(p.partnerPreference.heightMaxCm).feet)
        : "",
      heightMaxInches: p.partnerPreference?.heightMaxCm
        ? String(cmToFeetInches(p.partnerPreference.heightMaxCm).inches)
        : "",
      weightMinKg: p.partnerPreference?.weightMinKg?.toString() ?? "",
      weightMaxKg: p.partnerPreference?.weightMaxKg?.toString() ?? "",
      preferredDistricts: p.partnerPreference?.preferredDistricts ?? [],
      minimumEducation: p.partnerPreference?.minimumEducation ?? "",
      preferredProfession: Array.isArray(p.partnerPreference?.preferredProfession)
        ? p.partnerPreference.preferredProfession
        : p.partnerPreference?.preferredProfession
          ? [p.partnerPreference.preferredProfession]
          : [],
      beardPreference: p.partnerPreference?.beardPreference ?? "",
      prayerPreference: p.partnerPreference?.prayerPreference ?? "",
      hijabPreference:
        normalizeHijabPreference(p.partnerPreference?.hijabPreference ?? "") ??
        p.partnerPreference?.hijabPreference ??
        "",
      maritalStatusPref: Array.isArray(p.partnerPreference?.maritalStatusPref)
        ? p.partnerPreference.maritalStatusPref
        : p.partnerPreference?.maritalStatusPref
          ? [p.partnerPreference.maritalStatusPref]
          : [],
      additionalNotes: p.partnerPreference?.additionalNotes ?? "",
    });
    },
    [],
  );

  const loadProfile = useCallback(
    async (token: string, lang: string) => {
      const [dd, p, feedback] = await Promise.all([
        getDropdowns(lang),
        getMyProfile(token),
        getVerificationFeedback(token),
      ]);
      applyLoadedProfile(dd, p as Profile, feedback);
    },
    [applyLoadedProfile],
  );

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    const [p, feedback] = await Promise.all([
      getMyProfile(token),
      getVerificationFeedback(token),
    ]);
    setProfile(p as Profile);
    setVerificationFeedback(feedback);
  }, []);

  const completionMissing = useMemo(() => {
    const missing = profile?.completionMissing ?? [];
    return applyMediaCompletionOverrides(liveMedia ?? profile, missing);
  }, [liveMedia, profile]);

  const biodataComplete = isBiodataCompleteFromMissing(completionMissing);

  async function handleDismissVerificationAlerts() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setDismissingAlerts(true);
    try {
      await dismissVerificationAlerts(token);
      const feedback = await getVerificationFeedback(token);
      setVerificationFeedback(feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss alerts");
    } finally {
      setDismissingAlerts(false);
    }
  }

  useEffect(() => {
    if (!authSession || isStaffRole(authSession.role)) return;
    setProfilePaused(Boolean(authSession.isPaused));
    setProfilePausedAt(authSession.pausedAt ?? null);
  }, [authSession]);

  useEffect(() => {
    if (!mounted || loading || termsAccepted !== true || isStaffRole(userRole ?? "")) {
      return;
    }
    if (window.location.hash !== `#${PROFILE_ACCOUNT_STATUS_SECTION_ID}`) return;
    const timer = window.setTimeout(scrollToProfileAccountStatus, 150);
    return () => window.clearTimeout(timer);
  }, [mounted, loading, termsAccepted, userRole]);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    getProfileEditorBootstrap(token, locale)
      .then((data) => {
        setUserRole(data.role);
        setLoginPhone(data.phone ?? null);
        if (isStaffRole(data.role)) {
          setTermsAccepted(true);
          if (data.profile && data.dropdowns) {
            setStaffBootstrap({
              dropdowns: data.dropdowns,
              profile: data.profile as StaffProfile,
            });
          }
          return;
        }
        setTermsAccepted(data.termsAccepted);
        setCurrentTermsVersion(data.currentTermsVersion ?? "");
        setPreviousTermsVersion(data.termsVersion ?? null);
        setTermsDeclined(Boolean(data.termsDeclinedAt));
        if (data.termsAccepted && data.profile && data.dropdowns) {
          applyLoadedProfile(
            data.dropdowns,
            data.profile as Profile,
            data.verificationFeedback,
          );
          if (data.verificationFeedback) {
            setVerificationFeedback(data.verificationFeedback);
          }
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [applyLoadedProfile, locale, router]);

  async function handleTermsAccepted() {
    setTermsAccepted(true);
    setTermsDeclined(false);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setLoading(true);
    try {
      await loadProfile(token, locale);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (tab === "photos") return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    const validationError = getTabValidationError();
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      let updated: Profile;

      if (tab === "personal") {
        const personalPayload: Record<string, unknown> = {
          ...personal,
          hasBeard: showHasBeardField(personal.religion, personal.gender)
            ? personal.hasBeard || undefined
            : undefined,
          prayerPractice: isIslamReligion(personal.religion)
            ? personal.prayerPractice || undefined
            : undefined,
          hijabPractice: showHijabPracticeField(personal.religion, personal.gender)
            ? personal.hijabPractice || undefined
            : undefined,
          smokingHabit: showSmokingHabitField(personal.gender)
            ? personal.smokingHabit || undefined
            : undefined,
          heightUnit: "ft_in",
          heightFeet: personal.heightFeet ? Number(personal.heightFeet) : undefined,
          heightInches:
            personal.heightInches !== "" ? Number(personal.heightInches) : undefined,
          weightKg: personal.weightKg ? Number(personal.weightKg) : undefined,
          educationYear: personal.educationYear
            ? Number(personal.educationYear)
            : undefined,
          hobbies: personal.hobbies
            ? personal.hobbies.split(",").map((h) => h.trim()).filter(Boolean)
            : [],
          dateOfBirth: displayDateToIso(personal.dateOfBirth) ?? undefined,
        };

        if (requiresChildrenCountMaritalStatus(personal.maritalStatus)) {
          personalPayload.childrenCount = Number(personal.childrenCount);
        } else {
          delete personalPayload.childrenCount;
        }

        if (!isDivorcedMaritalStatus(personal.maritalStatus)) {
          delete personalPayload.divorceDetails;
        }

        if (!showSmokingHabitField(personal.gender)) {
          delete personalPayload.smokingHabit;
        }

        updated = await updatePersonal(token, personalPayload);
      } else if (tab === "family") {
        updated = await updateFamily(token, {
          ...family,
          fatherIsAlive: family.fatherIsAlive || undefined,
          motherIsAlive: family.motherIsAlive || undefined,
          siblings: family.siblings.map(toSiblingInput),
          paternalRelatives: family.paternalRelatives
            .filter(
              (relative) =>
                relative.relation ||
                relative.name ||
                relative.education ||
                relative.profession,
            )
            .map(toRelativeInput),
          maternalRelatives: family.maternalRelatives
            .filter(
              (relative) =>
                relative.relation ||
                relative.name ||
                relative.education ||
                relative.profession,
            )
            .map(toRelativeInput),
        });
      } else if (tab === "marital") {
        const kabinMin = parseExpectedKabinAmountInput(
          marital.expectedKabinAmountMinBdt,
        );
        const kabinMax = parseExpectedKabinAmountInput(
          marital.expectedKabinAmountMaxBdt,
        );
        const maritalPayload: Record<string, string | number | null | undefined> = {
          expectedMarriageTimeline: marital.expectedMarriageTimeline || undefined,
          weddingCeremonyPreference: marital.weddingCeremonyPreference || undefined,
          expectedParenthoodTimeline: marital.expectedParenthoodTimeline || undefined,
          livingArrangements: marital.livingArrangements || undefined,
          expectedKabinAmountMinBdt: kabinMin,
          expectedKabinAmountMaxBdt: kabinMax,
        };
        if (showDowryExpectationField(personal.gender)) {
          maritalPayload.dowryExpectation = marital.dowryExpectation || undefined;
        }
        if (
          showLivingArrangementsOtherField(
            personal.gender,
            marital.livingArrangements,
          )
        ) {
          maritalPayload.livingArrangementsOther =
            marital.livingArrangementsOther.trim() || undefined;
        } else if (
          marital.livingArrangements !== LIVING_ARRANGEMENTS_OTHER_MALE_VALUE
        ) {
          maritalPayload.livingArrangementsOther = undefined;
        }
        updated = await updateMarital(token, maritalPayload);
      } else if (tab === "partner") {
        updated = await updatePartner(token, {
          ageMin: partner.ageMin ? Number(partner.ageMin) : undefined,
          ageMax: partner.ageMax ? Number(partner.ageMax) : undefined,
          heightUnit: "ft_in",
          heightMinFeet: partner.heightMinFeet ? Number(partner.heightMinFeet) : undefined,
          heightMinInches:
            partner.heightMinInches !== "" ? Number(partner.heightMinInches) : undefined,
          heightMaxFeet: partner.heightMaxFeet ? Number(partner.heightMaxFeet) : undefined,
          heightMaxInches:
            partner.heightMaxInches !== "" ? Number(partner.heightMaxInches) : undefined,
          weightMinKg: partner.weightMinKg ? Number(partner.weightMinKg) : undefined,
          weightMaxKg: partner.weightMaxKg ? Number(partner.weightMaxKg) : undefined,
          preferredDistricts: partner.preferredDistricts,
          minimumEducation: partner.minimumEducation || undefined,
          preferredProfession: partner.preferredProfession,
          beardPreference: showBeardPreferenceField(
            personal.religion,
            personal.gender,
          )
            ? partner.beardPreference || undefined
            : undefined,
          prayerPreference: showPrayerPreferenceField(personal.religion)
            ? partner.prayerPreference || undefined
            : undefined,
          hijabPreference: showHijabPreferenceField(
            personal.religion,
            personal.gender,
          )
            ? partner.hijabPreference || undefined
            : undefined,
          maritalStatusPref: partner.maritalStatusPref,
          additionalNotes: partner.additionalNotes || undefined,
        });
      } else {
        return;
      }

      setProfile(updated);
      if (profile?.isVerified) {
        markProfileAmendmentDirty();
      }
      setMessage(t("saved"));

      const tabIndex = PROFILE_TABS.indexOf(tab);
      const nextTab =
        tabIndex >= 0 && tabIndex < PROFILE_TABS.length - 1
          ? PROFILE_TABS[tabIndex + 1]
          : null;
      if (nextTab) {
        setTab(nextTab);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function addSibling() {
    setFamily((f) => ({
      ...f,
      siblings: [
        ...f.siblings,
        {
          relationship: "",
          name: "",
          education: "",
          profession: "",
          maritalStatus: "",
          spouseName: "",
          spouseEducation: "",
          spouseProfession: "",
        },
      ],
    }));
  }

  function updateSibling(index: number, field: keyof Sibling, value: string) {
    setFamily((f) => ({
      ...f,
      siblings: f.siblings.map((s, i) => {
        if (i !== index) return s;
        const next = { ...s, [field]: value };
        if (field === "maritalStatus" && !isSiblingMarried(value)) {
          next.spouseName = "";
          next.spouseEducation = "";
          next.spouseProfession = "";
        }
        return next;
      }),
    }));
  }

  function removeSibling(index: number) {
    setFamily((f) => ({
      ...f,
      siblings: f.siblings.filter((_, i) => i !== index),
    }));
  }

  function addPaternalRelative() {
    setFamily((f) => ({
      ...f,
      paternalRelatives: [
        ...f.paternalRelatives,
        { relation: "", name: "", education: "", profession: "" },
      ],
    }));
  }

  function updatePaternalRelative(
    index: number,
    field: keyof FamilyRelative,
    value: string,
  ) {
    setFamily((f) => ({
      ...f,
      paternalRelatives: f.paternalRelatives.map((relative, i) =>
        i === index ? { ...relative, [field]: value } : relative,
      ),
    }));
  }

  function removePaternalRelative(index: number) {
    setFamily((f) => ({
      ...f,
      paternalRelatives: f.paternalRelatives.filter((_, i) => i !== index),
    }));
  }

  function addMaternalRelative() {
    setFamily((f) => ({
      ...f,
      maternalRelatives: [
        ...f.maternalRelatives,
        { relation: "", name: "", education: "", profession: "" },
      ],
    }));
  }

  function updateMaternalRelative(
    index: number,
    field: keyof FamilyRelative,
    value: string,
  ) {
    setFamily((f) => ({
      ...f,
      maternalRelatives: f.maternalRelatives.map((relative, i) =>
        i === index ? { ...relative, [field]: value } : relative,
      ),
    }));
  }

  function removeMaternalRelative(index: number) {
    setFamily((f) => ({
      ...f,
      maternalRelatives: f.maternalRelatives.filter((_, i) => i !== index),
    }));
  }

  if (userRole && isStaffRole(userRole)) {
    return (
      <StaffProfileForm
        role={userRole}
        initialDropdowns={staffBootstrap?.dropdowns}
        initialProfile={staffBootstrap?.profile}
      />
    );
  }

  if (termsDeclined) {
    return (
      <TermsDeclinedView
        onRetry={() => {
          setTermsDeclined(false);
          setTermsAccepted(false);
        }}
      />
    );
  }

  if (termsAccepted === false && !currentTermsVersion) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-700">
        {t("loading")}
      </div>
    );
  }

  if (termsAccepted === false) {
    return (
      <TermsAcceptanceGate
        onAccepted={handleTermsAccepted}
        onDeclined={() => setTermsDeclined(true)}
        currentTermsVersion={currentTermsVersion}
        previousTermsVersion={previousTermsVersion}
      />
    );
  }

  if (!mounted || loading || termsAccepted === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-700">
        {t("loading")}
      </div>
    );
  }

  const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
  const needsCreationIntent = profile?.creationMode == null;

  if (needsCreationIntent && authToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10">
        <ProfileCreationIntent
          token={authToken}
          onComplete={(updated) => {
            if (dropdowns) {
              applyLoadedProfile(dropdowns, updated, verificationFeedback);
            } else {
              setProfile(updated);
            }
          }}
        />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = PROFILE_TABS.map((id) => ({
    id,
    label: tt(id),
  }));
  const isMemberProfile = userRole != null && !isStaffRole(userRole);
  const isProfilePaused = Boolean(authSession?.isPaused ?? profilePaused);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
              {t("backHome")}
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">{t("title")}</h1>
            {profile?.profileCode ? (
              <div className="mt-1 space-y-1">
                <p className="text-sm font-medium text-zinc-700">
                  {t("profileCodeLabel", { code: profile.profileCode })}
                </p>
                {loginPhone ? (
                  <p className="text-sm text-zinc-700">
                    <span className="text-zinc-500">{t("loginPhoneLabel")}: </span>
                    <a
                      href={phoneTelHref(loginPhone)}
                      className="font-medium text-zinc-800 hover:underline"
                    >
                      {loginPhone}
                    </a>
                  </p>
                ) : null}
                <p className="text-xs text-zinc-500">{t("profileCodeHint")}</p>
                <Link
                  href="/profile/biodata"
                  className="inline-flex text-sm font-semibold text-rose-800 hover:text-rose-900"
                >
                  {t("exportBiodataPdf")}
                </Link>
              </div>
            ) : null}
            {profile && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-700">
                  {t("percentComplete", {
                    percent:
                      completionMissing.length === 0
                        ? 100
                        : profile.completionPercent ?? 0,
                  })}
                </p>
                {completionMissing.length > 0 && (
                  <p className="text-xs text-zinc-600">
                    {t("completionRemaining", {
                      count: completionMissing.length,
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-rose-500 transition-all"
              style={{
                width: `${
                  completionMissing.length === 0
                    ? 100
                    : profile?.completionPercent ?? 0
                }%`,
              }}
            />
          </div>
        </div>

        {profile && completionMissing.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">{t("completionMissingTitle")}</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {completionMissing.map((key) => (
                <li key={key}>{t(`completionChecklist.items.${key}`)}</li>
              ))}
            </ul>
          </div>
        )}

        {verificationFeedback && tab !== "photos" && (
          <VerificationFeedbackPanel
            feedback={verificationFeedback}
            onDismiss={handleDismissVerificationAlerts}
            dismissing={dismissingAlerts}
            compact
          />
        )}

        {isMemberProfile && isProfilePaused ? (
          <ProfilePausedBanner />
        ) : null}

        {isMemberProfile ? (
          <ProfileAccountStatusPanel
            isPaused={isProfilePaused}
            pausedAt={authSession?.pausedAt ?? profilePausedAt}
            onStatusChange={(paused) => {
              setProfilePaused(paused);
              if (!paused) setProfilePausedAt(null);
            }}
          />
        ) : null}

        <div className="flex gap-2 border-b-2 border-zinc-300">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              className={`px-4 py-2.5 text-sm font-semibold transition ${
                tab === tabItem.id
                  ? "border-b-2 border-rose-700 text-rose-800 -mb-0.5"
                  : "text-zinc-700 hover:text-zinc-950"
              }`}
            >
              {tabItem.label}
              {tabItem.id === "photos" &&
                verificationFeedback &&
                verificationFeedback.unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                    {verificationFeedback.unreadCount}
                  </span>
                )}
            </button>
          ))}
        </div>

        {message && (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {tab === "photos" ? (
          <div className="space-y-6 rounded-2xl border border-zinc-300 bg-white p-6 shadow-md">
            <ProfileMediaTab
              onError={setError}
              onMessage={setMessage}
              onProfileRefresh={refreshProfile}
              onMediaChange={setLiveMedia}
              biodataComplete={biodataComplete}
            />
          </div>
        ) : (
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md"
        >
          <div className="space-y-6 pb-4">
          <p className="text-xs text-zinc-600">{t("requiredLegend")}</p>
          {tab === "personal" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={tf("fullName")}
                value={personal.fullName}
                onChange={(v) => setPersonal({ ...personal, fullName: v })}
                disabled={Boolean(profile?.nidVerifiedAt)}
                hint={profile?.nidVerifiedAt ? tf("fullNameLockedAfterNid") : undefined}
              />
              <SelectField required label={tf("gender")} value={personal.gender} onChange={(v) => {
                const next = { ...personal, gender: v };
                if (!showHasBeardField(personal.religion, v)) {
                  next.hasBeard = "";
                }
                if (!showSmokingHabitField(v)) {
                  next.smokingHabit = "";
                }
                if (!showHijabPracticeField(personal.religion, v)) {
                  next.hijabPractice = "";
                }
                if (!showBeardPreferenceField(personal.religion, v)) {
                  setPartner((p) => ({ ...p, beardPreference: "" }));
                }
                if (!showHijabPreferenceField(personal.religion, v)) {
                  setPartner((p) => ({ ...p, hijabPreference: "" }));
                }
                setPersonal(next);
              }} options={dropdowns.gender ?? []} />
              <TextField
                required
                label={tf("dateOfBirth")}
                value={personal.dateOfBirth}
                onChange={(v) =>
                  setPersonal({
                    ...personal,
                    dateOfBirth: formatDisplayDateInput(v),
                  })
                }
                placeholder={tf("datePlaceholder")}
                inputMode="numeric"
                maxLength={10}
              />
              <SelectField required label={tf("maritalStatus")} value={personal.maritalStatus} onChange={(v) => {
                const next = { ...personal, maritalStatus: v };
                if (!isDivorcedMaritalStatus(v)) {
                  next.divorceDetails = "";
                }
                if (!requiresChildrenCountMaritalStatus(v)) {
                  next.childrenCount = "";
                }
                setPersonal(next);
              }} options={dropdowns.marital_status ?? []} />
              {isDivorcedMaritalStatus(personal.maritalStatus) && (
                <div className="sm:col-span-2">
                  <TextAreaField label={tf("divorceDetails")} value={personal.divorceDetails} onChange={(v) => setPersonal({ ...personal, divorceDetails: v })} rows={3} />
                </div>
              )}
              {requiresChildrenCountMaritalStatus(personal.maritalStatus) && (
                <TextField
                  required
                  label={tf("childrenCount")}
                  value={personal.childrenCount}
                  inputMode="numeric"
                  onChange={(v) =>
                    setPersonal({
                      ...personal,
                      childrenCount: sanitizeChildrenCountInput(v),
                    })
                  }
                />
              )}
              <HeightField
                label={tf("height")}
                feetLabel={tf("heightFeet")}
                inchesLabel={tf("heightInches")}
                selectLabel={tc("select")}
                feet={personal.heightFeet}
                inches={personal.heightInches}
                onFeetChange={(heightFeet) => setPersonal({ ...personal, heightFeet })}
                onInchesChange={(heightInches) => setPersonal({ ...personal, heightInches })}
              />
              <WeightField
                label={tf("weightKg")}
                value={personal.weightKg}
                onChange={(weightKg) => setPersonal({ ...personal, weightKg })}
              />
              <SelectField label={tf("complexion")} value={personal.complexion} onChange={(v) => setPersonal({ ...personal, complexion: v })} options={dropdowns.complexion ?? []} />
              <SelectField required label={tf("religion")} value={personal.religion} onChange={(v) => {
                const next = { ...personal, religion: v };
                if (!isIslamReligion(v)) {
                  next.hasBeard = "";
                  next.prayerPractice = "";
                  next.hijabPractice = "";
                  setPartner((p) => ({
                    ...p,
                    beardPreference: "",
                    prayerPreference: "",
                    hijabPreference: "",
                  }));
                }
                setPersonal(next);
              }} options={dropdowns.religion ?? []} />
              {isIslamReligion(personal.religion) && (
                <SelectField
                  required
                  label={tf("prayerPractice")}
                  value={personal.prayerPractice}
                  onChange={(v) => setPersonal({ ...personal, prayerPractice: v })}
                  options={prayerPracticeOptions}
                />
              )}
              {showHasBeardField(personal.religion, personal.gender) && (
                <SelectField
                  label={tf("hasBeard")}
                  value={personal.hasBeard}
                  onChange={(v) => setPersonal({ ...personal, hasBeard: v })}
                  options={hasBeardOptions}
                />
              )}
              {showSmokingHabitField(personal.gender) && (
                <SelectField
                  required
                  label={tf("smokingHabit")}
                  value={personal.smokingHabit}
                  onChange={(v) => setPersonal({ ...personal, smokingHabit: v })}
                  options={smokingHabitOptions}
                />
              )}
              {showHijabPracticeField(personal.religion, personal.gender) && (
                <SelectField
                  label={tf("hijabPractice")}
                  value={personal.hijabPractice}
                  onChange={(v) => setPersonal({ ...personal, hijabPractice: v })}
                  options={hijabPracticeOptions}
                />
              )}
              <SelectField required label={tf("educationMedium")} value={personal.educationMedium} onChange={(v) => setPersonal({ ...personal, educationMedium: v })} options={dropdowns.education_medium ?? []} allowCustom />
              <SelectField required label={tf("highestQualification")} value={personal.highestDegree} onChange={(v) => setPersonal({ ...personal, highestDegree: v })} options={dropdowns.education ?? []} allowCustom />
              <TextField label={tf("institution")} value={personal.institution} onChange={(v) => setPersonal({ ...personal, institution: v })} />
              <TextField label={tf("educationYear")} value={personal.educationYear} onChange={(v) => setPersonal({ ...personal, educationYear: v })} />
              <SelectField label={tf("subject")} value={personal.educationSubject} onChange={(v) => setPersonal({ ...personal, educationSubject: v })} options={dropdowns.education_subject ?? []} allowCustom />
              <div className="sm:col-span-2">
                <TextAreaField label={tf("additionalEducationQualifications")} value={personal.additionalEducationQualifications} onChange={(v) => setPersonal({ ...personal, additionalEducationQualifications: v })} rows={3} />
              </div>
              <SelectField required label={tf("occupation")} value={personal.occupation} onChange={(v) => setPersonal({ ...personal, occupation: v })} options={dropdowns.occupation ?? []} allowCustom />
              <TextField label={tf("company")} value={personal.company} onChange={(v) => setPersonal({ ...personal, company: v })} />
              <TextField label={tf("designation")} value={personal.designation} onChange={(v) => setPersonal({ ...personal, designation: v })} />
              <SelectField label={tf("monthlyIncome")} value={personal.monthlyIncomeRange} onChange={(v) => setPersonal({ ...personal, monthlyIncomeRange: v })} options={dropdowns.income_range ?? []} />
              <h3 className="sm:col-span-2 text-base font-bold text-zinc-950">{tf("currentAddress")}</h3>
              <MemberAddressFields
                divisions={dropdowns.division ?? []}
                districts={dropdowns.district ?? []}
                upazilas={dropdowns.upazila ?? []}
                address={{
                  country: personal.currentCountry,
                  division: personal.currentDivision,
                  district: personal.currentDistrict,
                  upazila: personal.currentUpazila,
                  cityTown: personal.currentCityTown,
                  addressLine: personal.currentAddressLine,
                }}
                onChange={(address) =>
                  setPersonal({
                    ...personal,
                    currentCountry: address.country,
                    currentDivision: address.division,
                    currentDistrict: address.district,
                    currentUpazila: address.upazila,
                    currentCityTown: address.cityTown,
                    currentAddressLine: address.addressLine,
                  })
                }
              />

              <h3 className="sm:col-span-2 text-base font-bold text-zinc-950">{tf("permanentAddress")}</h3>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                  <input
                    type="checkbox"
                    checked={personal.permanentSameAsCurrent}
                    onChange={(e) => setPersonal({ ...personal, permanentSameAsCurrent: e.target.checked })}
                    className="h-4 w-4 accent-rose-700"
                  />
                  {tf("permanentSameAsCurrent")}
                </label>
              </div>
              {!personal.permanentSameAsCurrent && (
                <MemberAddressFields
                  divisions={dropdowns.division ?? []}
                  districts={dropdowns.district ?? []}
                  upazilas={dropdowns.upazila ?? []}
                  address={{
                    country: personal.permanentCountry,
                    division: personal.permanentDivision,
                    district: personal.permanentDistrict,
                    upazila: personal.permanentUpazila,
                    cityTown: personal.permanentCityTown,
                    addressLine: personal.permanentAddressLine,
                  }}
                  onChange={(address) =>
                    setPersonal({
                      ...personal,
                      permanentCountry: address.country,
                      permanentDivision: address.division,
                      permanentDistrict: address.district,
                      permanentUpazila: address.upazila,
                      permanentCityTown: address.cityTown,
                      permanentAddressLine: address.addressLine,
                    })
                  }
                />
              )}
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                  <input
                    type="checkbox"
                    checked={personal.hasDisability}
                    onChange={(e) => setPersonal({ ...personal, hasDisability: e.target.checked })}
                    className="h-4 w-4 accent-rose-700"
                  />
                  {tf("hasDisability")}
                </label>
              </div>
              {personal.hasDisability && (
                <div className="sm:col-span-2">
                  <TextAreaField label={tf("disabilityInfo")} value={personal.disabilityInfo} onChange={(v) => setPersonal({ ...personal, disabilityInfo: v })} />
                </div>
              )}
              <div className="sm:col-span-2">
                <TextAreaField
                  required
                  label={tf("introduction")}
                  value={personal.introduction}
                  onChange={(v) => setPersonal({ ...personal, introduction: v })}
                  hint={tf("introductionHint")}
                />
              </div>
              <div className="sm:col-span-2">
                <TextAreaField
                  label={tf("biography")}
                  value={personal.biography}
                  onChange={(v) => setPersonal({ ...personal, biography: v })}
                  rows={4}
                  hint={tf("biographyHint")}
                />
              </div>
              <TextField
                label={tf("hobbies")}
                value={personal.hobbies}
                onChange={(v) => setPersonal({ ...personal, hobbies: v })}
                hint={tf("hobbiesHint")}
              />
              <TextField
                label={tf("interests")}
                value={personal.interests}
                onChange={(v) => setPersonal({ ...personal, interests: v })}
                hint={tf("interestsHint")}
              />
            </div>
          )}

          {tab === "family" && (
            <div className="space-y-6">
              <FamilySection title={ts("father")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label={tf("name")} value={family.fatherName} onChange={(v) => setFamily({ ...family, fatherName: v })} />
                  <SelectField label={tf("isAlive")} value={family.fatherIsAlive} onChange={(v) => setFamily({ ...family, fatherIsAlive: v })} options={isAliveOptions} />
                  <SelectField label={tf("education")} value={family.fatherEducation} onChange={(v) => setFamily({ ...family, fatherEducation: v })} options={dropdowns.education ?? []} allowCustom />
                  <SelectField required label={tf("profession")} value={family.fatherProfession} onChange={(v) => setFamily({ ...family, fatherProfession: v })} options={dropdowns.occupation ?? []} allowCustom />
                </div>
              </FamilySection>

              <FamilySection title={ts("mother")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label={tf("name")} value={family.motherName} onChange={(v) => setFamily({ ...family, motherName: v })} />
                  <SelectField label={tf("isAlive")} value={family.motherIsAlive} onChange={(v) => setFamily({ ...family, motherIsAlive: v })} options={isAliveOptions} />
                  <SelectField label={tf("education")} value={family.motherEducation} onChange={(v) => setFamily({ ...family, motherEducation: v })} options={dropdowns.education ?? []} allowCustom />
                  <SelectField required label={tf("profession")} value={family.motherProfession} onChange={(v) => setFamily({ ...family, motherProfession: v })} options={dropdowns.occupation ?? []} allowCustom />
                </div>
              </FamilySection>

              <FamilySection
                title={ts("siblings")}
                action={
                  <button type="button" onClick={addSibling} className="text-sm font-semibold text-rose-800 hover:underline">
                    {ts("addSibling")}
                  </button>
                }
              >
                {family.siblings.length > 0 && (
                  <div className="space-y-3">
                    {family.siblings.map((s, i) => (
                      <div key={i} className="grid gap-3 rounded-lg border border-zinc-300 bg-white p-4 sm:grid-cols-2">
                        <SelectField label={tf("relationship")} value={s.relationship ?? ""} onChange={(v) => updateSibling(i, "relationship", v)} options={dropdowns.sibling_relationship ?? []} />
                        <TextField label={tf("name")} value={s.name ?? ""} onChange={(v) => updateSibling(i, "name", v)} />
                        <SelectField label={tf("maritalStatus")} value={s.maritalStatus ?? ""} onChange={(v) => updateSibling(i, "maritalStatus", v)} options={dropdowns.marital_status ?? []} />
                        <SelectField label={tf("education")} value={s.education ?? ""} onChange={(v) => updateSibling(i, "education", v)} options={dropdowns.education ?? []} allowCustom />
                        <SelectField label={tf("profession")} value={s.profession ?? ""} onChange={(v) => updateSibling(i, "profession", v)} options={dropdowns.occupation ?? []} allowCustom />
                        {isSiblingMarried(s.maritalStatus) ? (
                          <>
                            <TextField label={tf("spouseName")} value={s.spouseName ?? ""} onChange={(v) => updateSibling(i, "spouseName", v)} />
                            <SelectField label={tf("spouseEducation")} value={s.spouseEducation ?? ""} onChange={(v) => updateSibling(i, "spouseEducation", v)} options={dropdowns.education ?? []} allowCustom />
                            <SelectField label={tf("spouseProfession")} value={s.spouseProfession ?? ""} onChange={(v) => updateSibling(i, "spouseProfession", v)} options={dropdowns.occupation ?? []} allowCustom />
                          </>
                        ) : null}
                        <button type="button" onClick={() => removeSibling(i)} className="text-left text-sm font-semibold text-red-700 sm:col-span-2">
                          {tc("remove")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </FamilySection>

              <FamilySection
                title={ts("paternalRelatives")}
                action={
                  <button
                    type="button"
                    onClick={addPaternalRelative}
                    className="text-sm font-semibold text-rose-800 hover:underline"
                  >
                    {ts("addPaternalRelative")}
                  </button>
                }
              >
                {family.paternalRelatives.length > 0 && (
                  <div className="space-y-3">
                    {family.paternalRelatives.map((relative, i) => (
                      <div
                        key={i}
                        className="grid gap-3 rounded-lg border border-zinc-300 bg-white p-4 sm:grid-cols-2"
                      >
                        <SelectField
                          label={tf("relation")}
                          value={relative.relation ?? ""}
                          onChange={(v) => updatePaternalRelative(i, "relation", v)}
                          options={relativeRelationOptions("paternal", tf)}
                        />
                        <TextField
                          label={tf("name")}
                          value={relative.name ?? ""}
                          onChange={(v) => updatePaternalRelative(i, "name", v)}
                        />
                        <SelectField
                          label={tf("education")}
                          value={relative.education ?? ""}
                          onChange={(v) => updatePaternalRelative(i, "education", v)}
                          options={dropdowns.education ?? []}
                          allowCustom
                        />
                        <SelectField
                          label={tf("profession")}
                          value={relative.profession ?? ""}
                          onChange={(v) => updatePaternalRelative(i, "profession", v)}
                          options={dropdowns.occupation ?? []}
                          allowCustom
                        />
                        <button
                          type="button"
                          onClick={() => removePaternalRelative(i)}
                          className="text-left text-sm font-semibold text-red-700 sm:col-span-2"
                        >
                          {tc("remove")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </FamilySection>

              <FamilySection
                title={ts("maternalRelatives")}
                action={
                  <button
                    type="button"
                    onClick={addMaternalRelative}
                    className="text-sm font-semibold text-rose-800 hover:underline"
                  >
                    {ts("addMaternalRelative")}
                  </button>
                }
              >
                {family.maternalRelatives.length > 0 && (
                  <div className="space-y-3">
                    {family.maternalRelatives.map((relative, i) => (
                      <div
                        key={i}
                        className="grid gap-3 rounded-lg border border-zinc-300 bg-white p-4 sm:grid-cols-2"
                      >
                        <SelectField
                          label={tf("relation")}
                          value={relative.relation ?? ""}
                          onChange={(v) => updateMaternalRelative(i, "relation", v)}
                          options={relativeRelationOptions("maternal", tf)}
                        />
                        <TextField
                          label={tf("name")}
                          value={relative.name ?? ""}
                          onChange={(v) => updateMaternalRelative(i, "name", v)}
                        />
                        <SelectField
                          label={tf("education")}
                          value={relative.education ?? ""}
                          onChange={(v) => updateMaternalRelative(i, "education", v)}
                          options={dropdowns.education ?? []}
                          allowCustom
                        />
                        <SelectField
                          label={tf("profession")}
                          value={relative.profession ?? ""}
                          onChange={(v) => updateMaternalRelative(i, "profession", v)}
                          options={dropdowns.occupation ?? []}
                          allowCustom
                        />
                        <button
                          type="button"
                          onClick={() => removeMaternalRelative(i)}
                          className="text-left text-sm font-semibold text-red-700 sm:col-span-2"
                        >
                          {tc("remove")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </FamilySection>

              <FamilySection title={ts("others")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label={tf("familyType")} value={family.familyType} onChange={(v) => setFamily({ ...family, familyType: v })} options={dropdowns.family_type ?? []} />
                  <SelectField label={tf("familyStatus")} value={family.familyStatus} onChange={(v) => setFamily({ ...family, familyStatus: v })} options={dropdowns.family_status ?? []} />
                  <div className="sm:col-span-2">
                    <TextAreaField label={tf("familyValues")} value={family.familyValues} onChange={(v) => setFamily({ ...family, familyValues: v })} />
                  </div>
                  <div className="sm:col-span-2">
                    <TextAreaField label={tf("familyAssets")} value={family.familyAssets} onChange={(v) => setFamily({ ...family, familyAssets: v })} />
                  </div>
                </div>
              </FamilySection>
            </div>
          )}

          {tab === "marital" && (
            <MaritalInformationTab
              marital={marital}
              gender={personal.gender}
              dropdowns={dropdowns}
              onChange={setMarital}
              tf={tf}
            />
          )}

          {tab === "partner" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <AgeField
                required
                label={tf("ageMin")}
                value={partner.ageMin}
                minAge={minMarriageAgeForPartnerPreference(personal.gender)}
                onChange={(ageMin) => setPartner({ ...partner, ageMin })}
              />
              <AgeField
                label={tf("ageMax")}
                value={partner.ageMax}
                minAge={minMarriageAgeForPartnerPreference(personal.gender)}
                onChange={(ageMax) => setPartner({ ...partner, ageMax })}
              />
              <HeightRangeField
                minLabel={tf("heightMin")}
                maxLabel={tf("heightMax")}
                feetLabel={tf("heightFeet")}
                inchesLabel={tf("heightInches")}
                selectLabel={tc("select")}
                minFeet={partner.heightMinFeet}
                minInches={partner.heightMinInches}
                maxFeet={partner.heightMaxFeet}
                maxInches={partner.heightMaxInches}
                onMinFeetChange={(heightMinFeet) => setPartner({ ...partner, heightMinFeet })}
                onMinInchesChange={(heightMinInches) => setPartner({ ...partner, heightMinInches })}
                onMaxFeetChange={(heightMaxFeet) => setPartner({ ...partner, heightMaxFeet })}
                onMaxInchesChange={(heightMaxInches) => setPartner({ ...partner, heightMaxInches })}
              />
              <WeightField
                label={tf("weightMin")}
                value={partner.weightMinKg}
                onChange={(weightMinKg) => setPartner({ ...partner, weightMinKg })}
              />
              <WeightField
                label={tf("weightMax")}
                value={partner.weightMaxKg}
                onChange={(weightMaxKg) => setPartner({ ...partner, weightMaxKg })}
              />
              <DistrictMultiSelectField
                label={tf("preferredDistricts")}
                hint={tf("preferredDistrictsHint")}
                filterLabel={tf("filterDistrictsByDivision")}
                allDivisionsLabel={tf("allDivisions")}
                selected={partner.preferredDistricts}
                onChange={(preferredDistricts) =>
                  setPartner({ ...partner, preferredDistricts })
                }
                districts={dropdowns.district ?? []}
                divisions={dropdowns.division ?? []}
              />
              <SelectField label={tf("minimumEducation")} value={partner.minimumEducation} onChange={(v) => setPartner({ ...partner, minimumEducation: v })} options={dropdowns.education ?? []} />
              <DropdownMultiSelectField
                label={tf("preferredProfession")}
                hint={tf("preferredProfessionsHint")}
                selected={partner.preferredProfession}
                onChange={(preferredProfession) =>
                  setPartner({ ...partner, preferredProfession })
                }
                options={dropdowns.occupation ?? []}
                allowCustom
              />
              {showBeardPreferenceField(personal.religion, personal.gender) && (
                <SelectField
                  label={tf("beardPreference")}
                  value={partner.beardPreference}
                  onChange={(v) => setPartner({ ...partner, beardPreference: v })}
                  options={beardPreferenceOptions}
                />
              )}
              {showPrayerPreferenceField(personal.religion) && (
                <SelectField
                  label={tf("prayerPreference")}
                  value={partner.prayerPreference}
                  onChange={(v) => setPartner({ ...partner, prayerPreference: v })}
                  options={prayerPreferenceOptions}
                />
              )}
              {showHijabPreferenceField(personal.religion, personal.gender) && (
                <SelectField
                  label={tf("hijabPreference")}
                  value={partner.hijabPreference}
                  onChange={(v) => setPartner({ ...partner, hijabPreference: v })}
                  options={hijabPreferenceOptions}
                />
              )}
              <DropdownMultiSelectField
                label={tf("maritalStatusPref")}
                hint={tf("maritalStatusPrefHint")}
                selected={partner.maritalStatusPref}
                onChange={(maritalStatusPref) =>
                  setPartner({ ...partner, maritalStatusPref })
                }
                options={dropdowns.marital_status ?? []}
                clearLabel={tf("clearMaritalStatuses")}
                selectedCountLabel={(count) =>
                  tf("maritalStatusesSelected", { count })
                }
              />
              <div className="sm:col-span-2">
                <TextAreaField label={tf("additionalNotes")} value={partner.additionalNotes} onChange={(v) => setPartner({ ...partner, additionalNotes: v })} rows={4} />
              </div>
            </div>
          )}

          </div>
          <div className="sticky bottom-0 -mx-6 border-t border-zinc-200 bg-white px-6 py-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-rose-700 px-4 py-3 font-semibold text-white shadow-sm hover:bg-rose-800 disabled:opacity-60 sm:w-auto"
            >
              {saving
                ? tc("saving")
                : tab === "partner"
                  ? tc("saveAndGoToPhotos")
                  : tc("saveAndContinue")}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
