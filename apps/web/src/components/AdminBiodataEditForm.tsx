"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  cmToFeetInches,
  displayDateToIso,
  formatDisplayDateInput,
  HAS_BEARD_VALUES,
  HIJAB_PRACTICE_VALUES,
  isoDateToDisplay,
  isIslamReligion,
  PRAYER_PRACTICE_VALUES,
  requiresChildrenCountMaritalStatus,
  showHasBeardField,
  showHijabPracticeField,
  showSmokingHabitField,
  SMOKING_HABIT_VALUES,
} from "@easymatch/shared";
import { DistrictMultiSelectField } from "@/components/DistrictFields";
import { DropdownMultiSelectField } from "@/components/DropdownMultiSelectField";
import { FieldLabel } from "@/components/FieldLabel";
import { HeightField, HeightRangeField } from "@/components/HeightField";
import { MemberAddressFields } from "@/components/MemberAddressFields";
import { WeightField } from "@/components/WeightField";
import type { DropdownMap } from "@/lib/api";
import {
  updateAdminMemberFamily,
  updateAdminMemberMarital,
  updateAdminMemberPartner,
  updateAdminMemberPersonal,
  type AdminBiodataSection,
} from "@/lib/admin-profiles";
import {
  updateStaffAssistedFamily,
  updateStaffAssistedMarital,
  updateStaffAssistedPartner,
  updateStaffAssistedPersonal,
} from "@/lib/staff-assisted";
import type { MemberAddressValues } from "@/lib/member-address";
import type { VerificationSubmission } from "@/lib/verification";

type Option = { value: string; label: string; parentValue?: string | null };

type AdminBiodataEditFormProps = {
  token: string;
  submission: VerificationSubmission;
  dropdowns: DropdownMap;
  onSaved: (next: VerificationSubmission) => void;
  onCancel?: () => void;
  onError: (message: string | null) => void;
  /** admin = Super Admin audit edit; intake = VO staff-assisted create flow */
  variant?: "admin" | "intake";
};

function str(value: string | number | boolean | null | undefined) {
  if (value == null) return "";
  return String(value);
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="field-input bg-white text-zinc-950"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <textarea
        value={value}
        rows={rows}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="field-input bg-white text-zinc-950"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
}) {
  const tc = useTranslations("common");
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="field-input bg-white text-zinc-950"
      >
        <option value="" className="bg-white text-zinc-950">
          {tc("select")}
        </option>
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            className="bg-white text-zinc-950"
          >
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function staticOptions(
  values: readonly string[],
  labelFor: (value: string) => string,
): Option[] {
  return values.map((value) => ({ value, label: labelFor(value) }));
}

export function AdminBiodataEditForm({
  token,
  submission,
  dropdowns,
  onSaved,
  onCancel,
  onError,
  variant = "admin",
}: AdminBiodataEditFormProps) {
  const isIntake = variant === "intake";
  const t = useTranslations("admin.profiles.editBiodata");
  const tIntake = useTranslations("verification.staffAssisted");
  const tf = useTranslations("profile.fields");
  const tp = useTranslations("profile");
  const tc = useTranslations("common");

  const [section, setSection] = useState<AdminBiodataSection>("personal");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const heightParts = submission.personal.heightCm
    ? cmToFeetInches(submission.personal.heightCm)
    : null;

  const [personal, setPersonal] = useState({
    fullName: str(submission.personal.fullName),
    gender: str(submission.personal.gender),
    dateOfBirth: isoDateToDisplay(submission.personal.dateOfBirth),
    maritalStatus: str(submission.personal.maritalStatus),
    divorceDetails: str(submission.personal.divorceDetails),
    childrenCount: str(submission.personal.childrenCount),
    heightFeet: heightParts?.feet ? String(heightParts.feet) : "",
    heightInches:
      heightParts != null ? String(heightParts.inches ?? 0) : "",
    weightKg: str(submission.personal.weightKg),
    complexion: str(submission.personal.complexion),
    hasDisability: submission.personal.hasDisability ? "true" : "false",
    disabilityInfo: str(submission.personal.disabilityInfo),
    religion: str(submission.personal.religion),
    hasBeard: str(submission.personal.hasBeard),
    prayerPractice: str(submission.personal.prayerPractice),
    hijabPractice: str(submission.personal.hijabPractice),
    smokingHabit: str(submission.personal.smokingHabit),
    educationMedium: str(submission.personal.educationMedium),
    highestDegree: str(submission.personal.highestDegree),
    additionalEducationQualifications: str(
      submission.personal.additionalEducationQualifications,
    ),
    institution: str(submission.personal.institution),
    educationYear: str(submission.personal.educationYear),
    educationSubject: str(submission.personal.educationSubject),
    occupation: str(submission.personal.occupation),
    company: str(submission.personal.company),
    designation: str(submission.personal.designation),
    monthlyIncomeRange: str(submission.personal.monthlyIncomeRange),
    permanentSameAsCurrent: Boolean(submission.personal.permanentSameAsCurrent),
    biography: str(submission.personal.biography),
    hobbies: Array.isArray(submission.personal.hobbies)
      ? submission.personal.hobbies.join(", ")
      : "",
    interests: str(submission.personal.interests),
    introduction: str(submission.personal.introduction),
  });

  const [currentAddress, setCurrentAddress] = useState<MemberAddressValues>({
    country: str(submission.personal.currentCountry),
    division: str(submission.personal.currentDivision),
    district: str(submission.personal.currentDistrict),
    upazila: str(submission.personal.currentUpazila),
    cityTown: str(submission.personal.currentCityTown),
    addressLine: str(submission.personal.currentAddressLine),
  });

  const [permanentAddress, setPermanentAddress] = useState<MemberAddressValues>({
    country: str(submission.personal.permanentCountry),
    division: str(submission.personal.permanentDivision),
    district: str(submission.personal.permanentDistrict),
    upazila: str(submission.personal.permanentUpazila),
    cityTown: str(submission.personal.permanentCityTown),
    addressLine: str(submission.personal.permanentAddressLine),
  });

  const [marital, setMarital] = useState({
    expectedMarriageTimeline: str(submission.marital?.expectedMarriageTimeline),
    dowryExpectation: str(submission.marital?.dowryExpectation),
    weddingCeremonyPreference: str(
      submission.marital?.weddingCeremonyPreference,
    ),
    expectedParenthoodTimeline: str(
      submission.marital?.expectedParenthoodTimeline,
    ),
    livingArrangements: str(submission.marital?.livingArrangements),
    livingArrangementsOther: str(submission.marital?.livingArrangementsOther),
    expectedKabinAmountMinBdt: str(
      submission.marital?.expectedKabinAmountMinBdt,
    ),
    expectedKabinAmountMaxBdt: str(
      submission.marital?.expectedKabinAmountMaxBdt,
    ),
  });

  const familyInfo = submission.familyInfo;
  const [family, setFamily] = useState({
    fatherName: str(familyInfo?.fatherName),
    fatherIsAlive: str(familyInfo?.fatherIsAlive),
    fatherEducation: str(familyInfo?.fatherEducation),
    fatherProfession: str(familyInfo?.fatherProfession),
    motherName: str(familyInfo?.motherName),
    motherIsAlive: str(familyInfo?.motherIsAlive),
    motherEducation: str(familyInfo?.motherEducation),
    motherProfession: str(familyInfo?.motherProfession),
    familyType: str(familyInfo?.familyType),
    familyStatus: str(familyInfo?.familyStatus),
    familyValues: str(familyInfo?.familyValues),
    familyAssets: str(familyInfo?.familyAssets),
  });

  const partner = submission.partnerPreference;
  const heightMinParts = partner?.heightMinCm
    ? cmToFeetInches(partner.heightMinCm)
    : null;
  const heightMaxParts = partner?.heightMaxCm
    ? cmToFeetInches(partner.heightMaxCm)
    : null;
  const [partnerForm, setPartnerForm] = useState({
    ageMin: str(partner?.ageMin),
    ageMax: str(partner?.ageMax),
    heightMinFeet: heightMinParts?.feet ? String(heightMinParts.feet) : "",
    heightMinInches:
      heightMinParts != null ? String(heightMinParts.inches ?? 0) : "",
    heightMaxFeet: heightMaxParts?.feet ? String(heightMaxParts.feet) : "",
    heightMaxInches:
      heightMaxParts != null ? String(heightMaxParts.inches ?? 0) : "",
    weightMinKg: str(partner?.weightMinKg),
    weightMaxKg: str(partner?.weightMaxKg),
    preferredDistricts: [...(partner?.preferredDistricts ?? [])],
    minimumEducation: str(partner?.minimumEducation),
    preferredProfession: Array.isArray(partner?.preferredProfession)
      ? [...partner.preferredProfession]
      : partner?.preferredProfession
        ? [String(partner.preferredProfession)]
        : [],
    beardPreference: str(partner?.beardPreference),
    prayerPreference: str(partner?.prayerPreference),
    hijabPreference: str(partner?.hijabPreference),
    maritalStatusPref: Array.isArray(partner?.maritalStatusPref)
      ? [...partner.maritalStatusPref]
      : partner?.maritalStatusPref
        ? [String(partner.maritalStatusPref)]
        : [],
    additionalNotes: str(partner?.additionalNotes),
  });

  const prayerOptions = useMemo(
    () =>
      staticOptions([...PRAYER_PRACTICE_VALUES], (v) => {
        try {
          return tf(`prayerPracticeOptions.${v}`);
        } catch {
          return v;
        }
      }),
    [tf],
  );

  const hasBeardOptions = useMemo(
    () =>
      staticOptions([...HAS_BEARD_VALUES], (v) => {
        try {
          return tf(`hasBeardOptions.${v}`);
        } catch {
          return v;
        }
      }),
    [tf],
  );

  const smokingOptions = useMemo(
    () =>
      staticOptions([...SMOKING_HABIT_VALUES], (v) => {
        try {
          return tf(`smokingHabitOptions.${v}`);
        } catch {
          return v;
        }
      }),
    [tf],
  );

  const hijabOptions = useMemo(
    () =>
      staticOptions([...HIJAB_PRACTICE_VALUES], (v) => {
        try {
          return tf(`hijabPracticeOptions.${v}`);
        } catch {
          return v;
        }
      }),
    [tf],
  );

  const isAliveOptions = useMemo(
    () =>
      staticOptions(["yes", "no", "prefer_not_to_say"], (v) => {
        try {
          return tf(`isAliveOptions.${v}`);
        } catch {
          return v;
        }
      }),
    [tf],
  );

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    onError(null);
    setSaving(true);
    try {
      let next: VerificationSubmission;
      if (section === "personal") {
        const payload: Record<string, unknown> = {
          fullName: personal.fullName || undefined,
          gender: personal.gender || undefined,
          dateOfBirth: displayDateToIso(personal.dateOfBirth) ?? undefined,
          maritalStatus: personal.maritalStatus || undefined,
          complexion: personal.complexion || undefined,
          hasDisability: personal.hasDisability === "true",
          disabilityInfo:
            personal.hasDisability === "true"
              ? personal.disabilityInfo || undefined
              : undefined,
          religion: personal.religion || undefined,
          educationMedium: personal.educationMedium || undefined,
          highestDegree: personal.highestDegree || undefined,
          additionalEducationQualifications:
            personal.additionalEducationQualifications || undefined,
          institution: personal.institution || undefined,
          educationYear: personal.educationYear
            ? Number(personal.educationYear)
            : undefined,
          educationSubject: personal.educationSubject || undefined,
          occupation: personal.occupation || undefined,
          company: personal.company || undefined,
          designation: personal.designation || undefined,
          monthlyIncomeRange: personal.monthlyIncomeRange || undefined,
          heightUnit: "ft_in",
          heightFeet: personal.heightFeet
            ? Number(personal.heightFeet)
            : undefined,
          heightInches:
            personal.heightInches !== ""
              ? Number(personal.heightInches)
              : undefined,
          weightKg: personal.weightKg ? Number(personal.weightKg) : undefined,
          currentCountry: currentAddress.country || undefined,
          currentDivision: currentAddress.division || undefined,
          currentDistrict: currentAddress.district || undefined,
          currentUpazila: currentAddress.upazila || undefined,
          currentCityTown: currentAddress.cityTown || undefined,
          currentAddressLine: currentAddress.addressLine || undefined,
          permanentSameAsCurrent: personal.permanentSameAsCurrent,
          permanentCountry: permanentAddress.country || undefined,
          permanentDivision: permanentAddress.division || undefined,
          permanentDistrict: permanentAddress.district || undefined,
          permanentUpazila: permanentAddress.upazila || undefined,
          permanentCityTown: permanentAddress.cityTown || undefined,
          permanentAddressLine: permanentAddress.addressLine || undefined,
          biography: personal.biography || undefined,
          hobbies: personal.hobbies
            ? personal.hobbies
                .split(",")
                .map((h) => h.trim())
                .filter(Boolean)
            : [],
          interests: personal.interests || undefined,
          introduction: personal.introduction || undefined,
        };

        if (personal.maritalStatus === "divorced") {
          payload.divorceDetails = personal.divorceDetails || undefined;
        }
        if (requiresChildrenCountMaritalStatus(personal.maritalStatus)) {
          payload.childrenCount = Number(personal.childrenCount || 0);
        }
        if (isIslamReligion(personal.religion)) {
          payload.prayerPractice = personal.prayerPractice || undefined;
        }
        if (showHasBeardField(personal.religion, personal.gender)) {
          payload.hasBeard = personal.hasBeard || undefined;
        }
        if (showHijabPracticeField(personal.religion, personal.gender)) {
          payload.hijabPractice = personal.hijabPractice || undefined;
        }
        if (showSmokingHabitField(personal.gender)) {
          payload.smokingHabit = personal.smokingHabit || undefined;
        }

        next = isIntake
          ? await updateStaffAssistedPersonal(
              token,
              submission.profileId,
              payload,
            )
          : await updateAdminMemberPersonal(
              token,
              submission.profileId,
              payload,
              reason,
            );
      } else if (section === "marital") {
        const maritalPayload = {
          expectedMarriageTimeline:
            marital.expectedMarriageTimeline || undefined,
          dowryExpectation: marital.dowryExpectation || undefined,
          weddingCeremonyPreference:
            marital.weddingCeremonyPreference || undefined,
          expectedParenthoodTimeline:
            marital.expectedParenthoodTimeline || undefined,
          livingArrangements: marital.livingArrangements || undefined,
          livingArrangementsOther:
            marital.livingArrangementsOther || undefined,
          expectedKabinAmountMinBdt: marital.expectedKabinAmountMinBdt
            ? Number(marital.expectedKabinAmountMinBdt)
            : undefined,
          expectedKabinAmountMaxBdt: marital.expectedKabinAmountMaxBdt
            ? Number(marital.expectedKabinAmountMaxBdt)
            : undefined,
        };
        next = isIntake
          ? await updateStaffAssistedMarital(
              token,
              submission.profileId,
              maritalPayload,
            )
          : await updateAdminMemberMarital(
              token,
              submission.profileId,
              maritalPayload,
              reason,
            );
      } else if (section === "family") {
        const familyPayload = {
          ...family,
          fatherIsAlive: family.fatherIsAlive || undefined,
          motherIsAlive: family.motherIsAlive || undefined,
        };
        next = isIntake
          ? await updateStaffAssistedFamily(
              token,
              submission.profileId,
              familyPayload,
            )
          : await updateAdminMemberFamily(
              token,
              submission.profileId,
              familyPayload,
              reason,
            );
      } else {
        const partnerPayload = {
          ageMin: partnerForm.ageMin ? Number(partnerForm.ageMin) : undefined,
          ageMax: partnerForm.ageMax ? Number(partnerForm.ageMax) : undefined,
          heightUnit: "ft_in" as const,
          heightMinFeet: partnerForm.heightMinFeet
            ? Number(partnerForm.heightMinFeet)
            : undefined,
          heightMinInches:
            partnerForm.heightMinInches !== ""
              ? Number(partnerForm.heightMinInches)
              : undefined,
          heightMaxFeet: partnerForm.heightMaxFeet
            ? Number(partnerForm.heightMaxFeet)
            : undefined,
          heightMaxInches:
            partnerForm.heightMaxInches !== ""
              ? Number(partnerForm.heightMaxInches)
              : undefined,
          weightMinKg: partnerForm.weightMinKg
            ? Number(partnerForm.weightMinKg)
            : undefined,
          weightMaxKg: partnerForm.weightMaxKg
            ? Number(partnerForm.weightMaxKg)
            : undefined,
          preferredDistricts: partnerForm.preferredDistricts,
          minimumEducation: partnerForm.minimumEducation || undefined,
          preferredProfession: partnerForm.preferredProfession,
          beardPreference: partnerForm.beardPreference || undefined,
          prayerPreference: partnerForm.prayerPreference || undefined,
          hijabPreference: partnerForm.hijabPreference || undefined,
          maritalStatusPref: partnerForm.maritalStatusPref,
          additionalNotes: partnerForm.additionalNotes || undefined,
        };
        next = isIntake
          ? await updateStaffAssistedPartner(
              token,
              submission.profileId,
              partnerPayload,
            )
          : await updateAdminMemberPartner(
              token,
              submission.profileId,
              partnerPayload,
              reason,
            );
      }
      onSaved(next);
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : isIntake
            ? tIntake("biodataSaveFailed")
            : t("saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  const tabs: AdminBiodataSection[] = [
    "personal",
    "marital",
    "family",
    "partner",
  ];

  return (
    <form
      onSubmit={handleSave}
      className={`space-y-4 rounded-xl border bg-white p-4 text-zinc-950 ${
        isIntake ? "border-sky-200" : "border-rose-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className={`text-base font-bold ${
              isIntake ? "text-sky-950" : "text-rose-950"
            }`}
          >
            {isIntake ? tIntake("biodataTitle") : t("title")}
          </h3>
          <p
            className={`mt-1 text-sm ${
              isIntake ? "text-sky-900/80" : "text-rose-900/80"
            }`}
          >
            {isIntake ? tIntake("biodataHint") : t("hint")}
          </p>
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800"
          >
            {tc("cancel")}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSection(tab)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              section === tab
                ? isIntake
                  ? "bg-sky-800 text-white"
                  : "bg-rose-800 text-white"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200"
            }`}
          >
            {t(`sections.${tab}`)}
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-600">{tp("requiredLegend")}</p>

      {!isIntake ? (
        <label className="block space-y-1.5">
          <FieldLabel>{t("reason")}</FieldLabel>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            className="field-input bg-white text-zinc-950"
            maxLength={500}
          />
        </label>
      ) : null}

      {section === "personal" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            label={tf("fullName")}
            value={personal.fullName}
            onChange={(fullName) => setPersonal({ ...personal, fullName })}
          />
          <SelectField
            required
            label={tf("gender")}
            value={personal.gender}
            onChange={(gender) => setPersonal({ ...personal, gender })}
            options={dropdowns.gender ?? []}
          />
          <TextField
            required
            label={tf("dateOfBirth")}
            value={personal.dateOfBirth}
            onChange={(dateOfBirth) =>
              setPersonal({
                ...personal,
                dateOfBirth: formatDisplayDateInput(dateOfBirth),
              })
            }
          />
          <SelectField
            required
            label={tf("maritalStatus")}
            value={personal.maritalStatus}
            onChange={(maritalStatus) =>
              setPersonal({ ...personal, maritalStatus })
            }
            options={dropdowns.marital_status ?? []}
          />
          {personal.maritalStatus === "divorced" ? (
            <div className="md:col-span-2">
              <TextAreaField
                label={tf("divorceDetails")}
                value={personal.divorceDetails}
                onChange={(divorceDetails) =>
                  setPersonal({ ...personal, divorceDetails })
                }
              />
            </div>
          ) : null}
          {requiresChildrenCountMaritalStatus(personal.maritalStatus) ? (
            <TextField
              required
              label={tf("childrenCount")}
              value={personal.childrenCount}
              onChange={(childrenCount) =>
                setPersonal({ ...personal, childrenCount })
              }
              type="number"
            />
          ) : null}
          <div className="md:col-span-2">
            <HeightField
              label={tf("height")}
              feetLabel={tf("heightFeet")}
              inchesLabel={tf("heightInches")}
              selectLabel={tc("select")}
              feet={personal.heightFeet}
              inches={personal.heightInches}
              onFeetChange={(heightFeet) =>
                setPersonal({ ...personal, heightFeet })
              }
              onInchesChange={(heightInches) =>
                setPersonal({ ...personal, heightInches })
              }
            />
          </div>
          <WeightField
            label={tf("weightKg")}
            value={personal.weightKg}
            onChange={(weightKg) => setPersonal({ ...personal, weightKg })}
          />
          <SelectField
            label={tf("complexion")}
            value={personal.complexion}
            onChange={(complexion) => setPersonal({ ...personal, complexion })}
            options={dropdowns.complexion ?? []}
          />
          <SelectField
            required
            label={tf("religion")}
            value={personal.religion}
            onChange={(religion) => setPersonal({ ...personal, religion })}
            options={dropdowns.religion ?? []}
          />
          {isIslamReligion(personal.religion) ? (
            <SelectField
              required
              label={tf("prayerPractice")}
              value={personal.prayerPractice}
              onChange={(prayerPractice) =>
                setPersonal({ ...personal, prayerPractice })
              }
              options={prayerOptions}
            />
          ) : null}
          {showHasBeardField(personal.religion, personal.gender) ? (
            <SelectField
              label={tf("hasBeard")}
              value={personal.hasBeard}
              onChange={(hasBeard) => setPersonal({ ...personal, hasBeard })}
              options={hasBeardOptions}
            />
          ) : null}
          {showSmokingHabitField(personal.gender) ? (
            <SelectField
              required
              label={tf("smokingHabit")}
              value={personal.smokingHabit}
              onChange={(smokingHabit) =>
                setPersonal({ ...personal, smokingHabit })
              }
              options={smokingOptions}
            />
          ) : null}
          {showHijabPracticeField(personal.religion, personal.gender) ? (
            <SelectField
              label={tf("hijabPractice")}
              value={personal.hijabPractice}
              onChange={(hijabPractice) =>
                setPersonal({ ...personal, hijabPractice })
              }
              options={hijabOptions}
            />
          ) : null}
          <SelectField
            label={tf("hasDisability")}
            value={personal.hasDisability}
            onChange={(hasDisability) =>
              setPersonal({ ...personal, hasDisability })
            }
            options={[
              { value: "false", label: tf("hasBeardOptions.no") },
              { value: "true", label: tf("hasBeardOptions.yes") },
            ]}
          />
          {personal.hasDisability === "true" ? (
            <div className="md:col-span-2">
              <TextAreaField
                label={tf("disabilityInfo")}
                value={personal.disabilityInfo}
                onChange={(disabilityInfo) =>
                  setPersonal({ ...personal, disabilityInfo })
                }
              />
            </div>
          ) : null}
          <SelectField
            required
            label={tf("educationMedium")}
            value={personal.educationMedium}
            onChange={(educationMedium) =>
              setPersonal({ ...personal, educationMedium })
            }
            options={dropdowns.education_medium ?? []}
          />
          <SelectField
            required
            label={tf("highestQualification")}
            value={personal.highestDegree}
            onChange={(highestDegree) =>
              setPersonal({ ...personal, highestDegree })
            }
            options={dropdowns.education ?? []}
          />
          <TextField
            label={tf("institution")}
            value={personal.institution}
            onChange={(institution) => setPersonal({ ...personal, institution })}
          />
          <TextField
            label={tf("educationYear")}
            value={personal.educationYear}
            onChange={(educationYear) =>
              setPersonal({ ...personal, educationYear })
            }
            type="number"
          />
          <SelectField
            label={tf("subject")}
            value={personal.educationSubject}
            onChange={(educationSubject) =>
              setPersonal({ ...personal, educationSubject })
            }
            options={dropdowns.education_subject ?? []}
          />
          <div className="md:col-span-2">
            <TextAreaField
              label={tf("additionalEducationQualifications")}
              value={personal.additionalEducationQualifications}
              onChange={(additionalEducationQualifications) =>
                setPersonal({
                  ...personal,
                  additionalEducationQualifications,
                })
              }
            />
          </div>
          <SelectField
            required
            label={tf("occupation")}
            value={personal.occupation}
            onChange={(occupation) => setPersonal({ ...personal, occupation })}
            options={dropdowns.occupation ?? []}
          />
          <TextField
            label={tf("company")}
            value={personal.company}
            onChange={(company) => setPersonal({ ...personal, company })}
          />
          <TextField
            label={tf("designation")}
            value={personal.designation}
            onChange={(designation) => setPersonal({ ...personal, designation })}
          />
          <SelectField
            label={tf("monthlyIncome")}
            value={personal.monthlyIncomeRange}
            onChange={(monthlyIncomeRange) =>
              setPersonal({ ...personal, monthlyIncomeRange })
            }
            options={dropdowns.income_range ?? []}
          />
          <div className="md:col-span-2 space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-sm font-semibold text-zinc-800">
              {tf("currentAddress")}
            </p>
            <MemberAddressFields
              address={currentAddress}
              onChange={setCurrentAddress}
              divisions={dropdowns.division ?? []}
              districts={dropdowns.district ?? []}
              upazilas={dropdowns.upazila ?? []}
            />
          </div>
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={personal.permanentSameAsCurrent}
              onChange={(e) =>
                setPersonal({
                  ...personal,
                  permanentSameAsCurrent: e.target.checked,
                })
              }
            />
            {tf("permanentSameAsCurrent")}
          </label>
          {!personal.permanentSameAsCurrent ? (
            <div className="md:col-span-2 space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-sm font-semibold text-zinc-800">
                {tf("permanentAddress")}
              </p>
              <MemberAddressFields
                address={permanentAddress}
                onChange={setPermanentAddress}
                divisions={dropdowns.division ?? []}
                districts={dropdowns.district ?? []}
                upazilas={dropdowns.upazila ?? []}
              />
            </div>
          ) : null}
          <div className="md:col-span-2">
            <TextAreaField
              label={tf("biography")}
              value={personal.biography}
              onChange={(biography) => setPersonal({ ...personal, biography })}
            />
          </div>
          <TextField
            label={tf("hobbies")}
            value={personal.hobbies}
            onChange={(hobbies) => setPersonal({ ...personal, hobbies })}
          />
          <TextField
            label={tf("interests")}
            value={personal.interests}
            onChange={(interests) => setPersonal({ ...personal, interests })}
          />
          <div className="md:col-span-2">
            <TextAreaField
              required
              label={tf("introduction")}
              value={personal.introduction}
              onChange={(introduction) =>
                setPersonal({ ...personal, introduction })
              }
            />
          </div>
        </div>
      ) : null}

      {section === "marital" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField
            label={tf("expectedMarriageTimeline")}
            value={marital.expectedMarriageTimeline}
            onChange={(expectedMarriageTimeline) =>
              setMarital({ ...marital, expectedMarriageTimeline })
            }
            options={dropdowns.expected_marriage_timeline ?? []}
          />
          <SelectField
            label={tf("dowryExpectation")}
            value={marital.dowryExpectation}
            onChange={(dowryExpectation) =>
              setMarital({ ...marital, dowryExpectation })
            }
            options={dropdowns.dowry_expectation ?? []}
          />
          <SelectField
            label={tf("weddingCeremonyPreference")}
            value={marital.weddingCeremonyPreference}
            onChange={(weddingCeremonyPreference) =>
              setMarital({ ...marital, weddingCeremonyPreference })
            }
            options={dropdowns.wedding_ceremony_preference ?? []}
          />
          <SelectField
            label={tf("expectedParenthoodTimeline")}
            value={marital.expectedParenthoodTimeline}
            onChange={(expectedParenthoodTimeline) =>
              setMarital({ ...marital, expectedParenthoodTimeline })
            }
            options={dropdowns.expected_parenthood_timeline ?? []}
          />
          <SelectField
            label={tf("livingArrangements")}
            value={marital.livingArrangements}
            onChange={(livingArrangements) =>
              setMarital({ ...marital, livingArrangements })
            }
            options={dropdowns.living_arrangements ?? []}
          />
          <TextField
            label={tf("livingArrangementsOther")}
            value={marital.livingArrangementsOther}
            onChange={(livingArrangementsOther) =>
              setMarital({ ...marital, livingArrangementsOther })
            }
          />
          <TextField
            label={tf("expectedKabinAmountMin")}
            value={marital.expectedKabinAmountMinBdt}
            onChange={(expectedKabinAmountMinBdt) =>
              setMarital({ ...marital, expectedKabinAmountMinBdt })
            }
            type="number"
          />
          <TextField
            label={tf("expectedKabinAmountMax")}
            value={marital.expectedKabinAmountMaxBdt}
            onChange={(expectedKabinAmountMaxBdt) =>
              setMarital({ ...marital, expectedKabinAmountMaxBdt })
            }
            type="number"
          />
        </div>
      ) : null}

      {section === "family" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <p className="md:col-span-2 text-sm font-semibold text-zinc-800">
            {tp("sections.father")}
          </p>
          <TextField
            label={tf("name")}
            value={family.fatherName}
            onChange={(fatherName) => setFamily({ ...family, fatherName })}
          />
          <SelectField
            label={tf("isAlive")}
            value={family.fatherIsAlive}
            onChange={(fatherIsAlive) =>
              setFamily({ ...family, fatherIsAlive })
            }
            options={isAliveOptions}
          />
          <SelectField
            label={tf("education")}
            value={family.fatherEducation}
            onChange={(fatherEducation) =>
              setFamily({ ...family, fatherEducation })
            }
            options={dropdowns.education ?? []}
          />
          <SelectField
            required
            label={tf("profession")}
            value={family.fatherProfession}
            onChange={(fatherProfession) =>
              setFamily({ ...family, fatherProfession })
            }
            options={dropdowns.occupation ?? []}
          />
          <p className="md:col-span-2 text-sm font-semibold text-zinc-800">
            {tp("sections.mother")}
          </p>
          <TextField
            label={tf("name")}
            value={family.motherName}
            onChange={(motherName) => setFamily({ ...family, motherName })}
          />
          <SelectField
            label={tf("isAlive")}
            value={family.motherIsAlive}
            onChange={(motherIsAlive) =>
              setFamily({ ...family, motherIsAlive })
            }
            options={isAliveOptions}
          />
          <SelectField
            label={tf("education")}
            value={family.motherEducation}
            onChange={(motherEducation) =>
              setFamily({ ...family, motherEducation })
            }
            options={dropdowns.education ?? []}
          />
          <SelectField
            required
            label={tf("profession")}
            value={family.motherProfession}
            onChange={(motherProfession) =>
              setFamily({ ...family, motherProfession })
            }
            options={dropdowns.occupation ?? []}
          />
          <SelectField
            label={tf("familyType")}
            value={family.familyType}
            onChange={(familyType) => setFamily({ ...family, familyType })}
            options={dropdowns.family_type ?? []}
          />
          <SelectField
            label={tf("familyStatus")}
            value={family.familyStatus}
            onChange={(familyStatus) => setFamily({ ...family, familyStatus })}
            options={dropdowns.family_status ?? []}
          />
          <div className="md:col-span-2">
            <TextAreaField
              label={tf("familyValues")}
              value={family.familyValues}
              onChange={(familyValues) =>
                setFamily({ ...family, familyValues })
              }
            />
          </div>
          <div className="md:col-span-2">
            <TextAreaField
              label={tf("familyAssets")}
              value={family.familyAssets}
              onChange={(familyAssets) =>
                setFamily({ ...family, familyAssets })
              }
            />
          </div>
          <p className="md:col-span-2 text-xs text-zinc-600">
            {t("familyListsNote")}
          </p>
        </div>
      ) : null}

      {section === "partner" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            required
            label={tf("ageMin")}
            value={partnerForm.ageMin}
            onChange={(ageMin) => setPartnerForm({ ...partnerForm, ageMin })}
            type="number"
          />
          <TextField
            label={tf("ageMax")}
            value={partnerForm.ageMax}
            onChange={(ageMax) => setPartnerForm({ ...partnerForm, ageMax })}
            type="number"
          />
          <div className="md:col-span-2">
            <HeightRangeField
              minLabel={tf("heightMin")}
              maxLabel={tf("heightMax")}
              feetLabel={tf("heightFeet")}
              inchesLabel={tf("heightInches")}
              selectLabel={tc("select")}
              minFeet={partnerForm.heightMinFeet}
              minInches={partnerForm.heightMinInches}
              maxFeet={partnerForm.heightMaxFeet}
              maxInches={partnerForm.heightMaxInches}
              onMinFeetChange={(heightMinFeet) =>
                setPartnerForm({ ...partnerForm, heightMinFeet })
              }
              onMinInchesChange={(heightMinInches) =>
                setPartnerForm({ ...partnerForm, heightMinInches })
              }
              onMaxFeetChange={(heightMaxFeet) =>
                setPartnerForm({ ...partnerForm, heightMaxFeet })
              }
              onMaxInchesChange={(heightMaxInches) =>
                setPartnerForm({ ...partnerForm, heightMaxInches })
              }
            />
          </div>
          <WeightField
            label={tf("weightMin")}
            value={partnerForm.weightMinKg}
            onChange={(weightMinKg) =>
              setPartnerForm({ ...partnerForm, weightMinKg })
            }
          />
          <WeightField
            label={tf("weightMax")}
            value={partnerForm.weightMaxKg}
            onChange={(weightMaxKg) =>
              setPartnerForm({ ...partnerForm, weightMaxKg })
            }
          />
          <div className="md:col-span-2">
            <DistrictMultiSelectField
              label={tf("preferredDistricts")}
              hint={tf("preferredDistrictsHint")}
              filterLabel={tf("filterDistrictsByDivision")}
              allDivisionsLabel={tf("allDivisions")}
              selected={partnerForm.preferredDistricts}
              onChange={(preferredDistricts) =>
                setPartnerForm({ ...partnerForm, preferredDistricts })
              }
              districts={dropdowns.district ?? []}
              divisions={dropdowns.division ?? []}
            />
          </div>
          <SelectField
            label={tf("minimumEducation")}
            value={partnerForm.minimumEducation}
            onChange={(minimumEducation) =>
              setPartnerForm({ ...partnerForm, minimumEducation })
            }
            options={dropdowns.education ?? []}
          />
          <div className="md:col-span-2">
            <DropdownMultiSelectField
              label={tf("preferredProfession")}
              hint={tf("preferredProfessionsHint")}
              selected={partnerForm.preferredProfession}
              onChange={(preferredProfession) =>
                setPartnerForm({ ...partnerForm, preferredProfession })
              }
              options={dropdowns.occupation ?? []}
              allowCustom
            />
          </div>
          <div className="md:col-span-2">
            <DropdownMultiSelectField
              label={tf("maritalStatusPref")}
              hint={tf("maritalStatusPrefHint")}
              selected={partnerForm.maritalStatusPref}
              onChange={(maritalStatusPref) =>
                setPartnerForm({ ...partnerForm, maritalStatusPref })
              }
              options={dropdowns.marital_status ?? []}
              clearLabel={tf("clearMaritalStatuses")}
              selectedCountLabel={(count) =>
                tf("maritalStatusesSelected", { count })
              }
            />
          </div>
          <SelectField
            label={tf("beardPreference")}
            value={partnerForm.beardPreference}
            onChange={(beardPreference) =>
              setPartnerForm({ ...partnerForm, beardPreference })
            }
            options={dropdowns.beard_preference ?? []}
          />
          <SelectField
            label={tf("prayerPreference")}
            value={partnerForm.prayerPreference}
            onChange={(prayerPreference) =>
              setPartnerForm({ ...partnerForm, prayerPreference })
            }
            options={dropdowns.prayer_preference ?? []}
          />
          <SelectField
            label={tf("hijabPreference")}
            value={partnerForm.hijabPreference}
            onChange={(hijabPreference) =>
              setPartnerForm({ ...partnerForm, hijabPreference })
            }
            options={dropdowns.hijab_preference ?? []}
          />
          <div className="md:col-span-2">
            <TextAreaField
              label={tf("additionalNotes")}
              value={partnerForm.additionalNotes}
              onChange={(additionalNotes) =>
                setPartnerForm({ ...partnerForm, additionalNotes })
              }
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving
            ? isIntake
              ? tIntake("biodataSaving")
              : t("saving")
            : isIntake
              ? tIntake("biodataSave")
              : t("saveSection")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}
