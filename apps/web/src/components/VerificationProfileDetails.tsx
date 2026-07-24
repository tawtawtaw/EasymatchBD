"use client";

import type { ReactNode } from "react";
import {
  formatHeightFromCm,
  getVerificationBiodataSnapshotValue,
  hasVerificationPathPrefix,
  isIslamReligion,
  requiresChildrenCountMaritalStatus,
  showHasBeardField,
  showDowryExpectationField,
  showHijabPracticeField,
  showLivingArrangementsOtherField,
  showSmokingHabitField,
} from "@easymatch/shared";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { DropdownMap } from "@/lib/api";
import {
  createFieldOptionResolver,
  formatBiodataFieldValue,
} from "@/lib/biodata-display";
import { formatMemberAddress } from "@/lib/member-address";
import type { VerificationSubmission } from "@/lib/verification";

function display(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatHeight(heightCm: number | null | undefined) {
  return formatHeightFromCm(heightCm) ?? "—";
}

type AddressPart = {
  key: string;
  value: string | null | undefined;
};

function formatAddressBlock(
  address: {
    country: string | null | undefined;
    division: string | null | undefined;
    district: string | null | undefined;
    upazila: string | null | undefined;
    cityTown: string | null | undefined;
    addressLine: string | null | undefined;
  },
  formatValue: (key: string, value: unknown) => string,
) {
  return (
    formatMemberAddress(
      {
        country: address.country ?? "Bangladesh",
        division: address.division ?? "",
        district: address.district ?? "",
        upazila: address.upazila ?? "",
        cityTown: address.cityTown ?? "",
        addressLine: address.addressLine ?? "",
      },
      (district) => formatValue("currentDistrict", district),
      (division) => formatValue("currentDivision", division),
      (upazila) => formatValue("currentUpazila", upazila),
    ) || "—"
  );
}

function useFieldFormatter(
  dropdowns: DropdownMap,
  personal?: Record<string, unknown>,
) {
  const locale = useLocale();
  const tf = useTranslations("profile.fields");
  const tb = useTranslations("biodataExport");

  const resolveStaticOption = useMemo(
    () =>
      createFieldOptionResolver((relativeKey) => tf(relativeKey as never)),
    [tf],
  );

  return useMemo(() => {
    const formatValue = (
      key: string,
      value: unknown,
      options?: { relativeRelationGroup?: string },
    ) =>
      formatBiodataFieldValue(key, value, {
        locale,
        dropdowns,
        personal,
        resolveStaticOption,
        yesLabel: tb("yes"),
        noLabel: tb("no"),
        relativeRelationGroup: options?.relativeRelationGroup,
        translateField: (fieldKey) => tf(fieldKey as never),
        allDistrictsLabel: tf("allDistrictsOfBangladesh"),
        anyReligionLabel: tf("anyReligion"),
      });

    return formatValue;
  }, [dropdowns, locale, personal, resolveStaticOption, tb, tf]);
}

function useBiodataChangeTracker(
  submission: VerificationSubmission,
  fmt: ReturnType<typeof useFieldFormatter>,
  tf: ReturnType<typeof useTranslations<"profile.fields">>,
  previousLabel: (value: string) => string,
) {
  const biodataChanges = submission.biodataChanges;
  const changedSet = useMemo(
    () => new Set(biodataChanges?.changedPaths ?? []),
    [biodataChanges?.changedPaths],
  );

  const formatPrevious = useCallback(
    (
      path: string,
      formatKey?: string,
      options?: { relativeRelationGroup?: string; optionPrefix?: string },
    ) => {
      const raw = getVerificationBiodataSnapshotValue(
        biodataChanges?.previousSnapshot,
        path,
      );
      if (raw === undefined || raw === null || raw === "") {
        return previousLabel("—");
      }
      if (
        formatKey === "heightCm" ||
        formatKey === "heightMinCm" ||
        formatKey === "heightMaxCm"
      ) {
        return previousLabel(formatHeightFromCm(raw as number) ?? "—");
      }
      if (options?.optionPrefix && typeof raw === "string") {
        return previousLabel(tf(`${options.optionPrefix}.${raw}` as never));
      }
      if (formatKey) {
        return previousLabel(
          fmt(formatKey, raw, {
            relativeRelationGroup: options?.relativeRelationGroup,
          }),
        );
      }
      return previousLabel(display(raw as string | number | boolean | null));
    },
    [biodataChanges?.previousSnapshot, fmt, previousLabel, tf],
  );

  const item = useCallback(
    (
      path: string,
      formatKey?: string,
      options?: { relativeRelationGroup?: string; optionPrefix?: string },
    ) => {
      if (!biodataChanges?.hasBaseline || !changedSet.has(path)) {
        return {};
      }
      return {
        changed: true,
        previousValue: formatPrevious(path, formatKey, options),
      };
    },
    [biodataChanges?.hasBaseline, changedSet, formatPrevious],
  );

  const blockChanged = useCallback(
    (prefix: string) =>
      hasVerificationPathPrefix(biodataChanges?.changedPaths ?? [], prefix),
    [biodataChanges?.changedPaths],
  );

  return {
    item,
    blockChanged,
    hasChanges: (biodataChanges?.changedPaths.length ?? 0) > 0,
  };
}

function DetailItem({
  label,
  value,
  className,
  changed = false,
  previousValue,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  changed?: boolean;
  previousValue?: ReactNode;
}) {
  return (
    <div
      className={
        changed
          ? `rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 ${className ?? ""}`
          : className
      }
    >
      <dt className={changed ? "font-medium text-amber-900" : "text-zinc-500"}>
        {label}
      </dt>
      <dd className={changed ? "font-semibold text-amber-950" : "font-medium text-zinc-900"}>
        {value}
      </dd>
      {changed && previousValue != null && (
        <p className="mt-1 text-xs text-amber-800">{previousValue}</p>
      )}
    </div>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-3 text-sm sm:grid-cols-2">{children}</dl>;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function biodataStatusClass(status: string | null) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

function hasMaritalContent(marital: VerificationSubmission["marital"]): boolean {
  return Object.values(marital).some(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

export function VerificationProfileDetails({
  submission,
  acting,
  onBiodataReview,
  onRequestBiodataReject,
  readOnly = false,
  dropdowns = {},
}: {
  submission: VerificationSubmission;
  acting: string | null;
  onBiodataReview: (
    decision: "approved" | "rejected",
    officerMessage?: string,
  ) => void;
  onRequestBiodataReject?: () => void;
  readOnly?: boolean;
  dropdowns?: DropdownMap;
}) {
  const t = useTranslations("verification");
  const tf = useTranslations("profile.fields");
  const ts = useTranslations("profile.sections");
  const personal = submission.personal;
  const marital = submission.marital ?? {
    expectedMarriageTimeline: null,
    dowryExpectation: null,
    weddingCeremonyPreference: null,
    expectedParenthoodTimeline: null,
    livingArrangements: null,
    livingArrangementsOther: null,
    expectedKabinAmountMinBdt: null,
    expectedKabinAmountMaxBdt: null,
  };
  const biodataChanges = submission.biodataChanges ?? {
    hasBaseline: false,
    changedPaths: [],
    previousSnapshot: null,
  };
  const submissionWithChanges = { ...submission, biodataChanges };
  const biodataStatus = submission.profileBiodataReviewStatus;
  const fmt = useFieldFormatter(dropdowns, personal as Record<string, unknown>);
  const previousLabel = useCallback(
    (value: string) => t("previousValue", { value }),
    [t],
  );
  const change = useBiodataChangeTracker(submissionWithChanges, fmt, tf, previousLabel);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">{t("profileDetails")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("profileDetailsHint")}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${biodataStatusClass(biodataStatus)}`}
        >
          {biodataStatus
            ? t(`status.${biodataStatus}`)
            : t("biodataNotSubmitted")}
        </span>
      </div>

      {change.hasChanges ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t("changesLegend")}
        </div>
      ) : null}

      <Section title={t("personalSection")}>
        <DetailGrid>
          <DetailItem label={tf("fullName")} value={display(personal.fullName)} {...change.item("personal.fullName", "fullName")} />
          <DetailItem label={tf("gender")} value={fmt("gender", personal.gender)} {...change.item("personal.gender", "gender")} />
          <DetailItem
            label={tf("dateOfBirth")}
            value={fmt("date_of_birth", personal.dateOfBirth)}
            {...change.item("personal.dateOfBirth", "date_of_birth")}
          />
          <DetailItem
            label={tf("maritalStatus")}
            value={fmt("maritalStatus", personal.maritalStatus)}
            {...change.item("personal.maritalStatus", "maritalStatus")}
          />
          {personal.maritalStatus === "divorced" && (
            <DetailItem
              label={tf("divorceDetails")}
              value={display(personal.divorceDetails)}
              className="sm:col-span-2"
              {...change.item("personal.divorceDetails", "divorceDetails")}
            />
          )}
          {requiresChildrenCountMaritalStatus(personal.maritalStatus) && (
            <DetailItem
              label={tf("childrenCount")}
              value={display(personal.childrenCount)}
              {...change.item("personal.childrenCount", "childrenCount")}
            />
          )}
          <DetailItem
            label={tf("height")}
            value={formatHeight(personal.heightCm)}
            {...change.item("personal.heightCm", "heightCm")}
          />
          <DetailItem label={tf("weightKg")} value={fmt("weight", personal.weightKg)} {...change.item("personal.weightKg", "weight")} />
          <DetailItem label={tf("complexion")} value={fmt("complexion", personal.complexion)} {...change.item("personal.complexion", "complexion")} />
          <DetailItem label={tf("religion")} value={fmt("religion", personal.religion)} {...change.item("personal.religion", "religion")} />
          {isIslamReligion(personal.religion) && personal.prayerPractice && (
            <DetailItem
              label={tf("prayerPractice")}
              value={tf(`prayerPracticeOptions.${personal.prayerPractice}`)}
              {...change.item("personal.prayerPractice", undefined, {
                optionPrefix: "prayerPracticeOptions",
              })}
            />
          )}
          {showHasBeardField(personal.religion, personal.gender) &&
            personal.hasBeard && (
              <DetailItem
                label={tf("hasBeard")}
                value={tf(`hasBeardOptions.${personal.hasBeard}`)}
                {...change.item("personal.hasBeard", undefined, {
                  optionPrefix: "hasBeardOptions",
                })}
              />
            )}
          {showSmokingHabitField(personal.gender) && personal.smokingHabit && (
            <DetailItem
              label={tf("smokingHabit")}
              value={tf(`smokingHabitOptions.${personal.smokingHabit}`)}
              {...change.item("personal.smokingHabit", undefined, {
                optionPrefix: "smokingHabitOptions",
              })}
            />
          )}
          {showHijabPracticeField(personal.religion, personal.gender) &&
            personal.hijabPractice && (
              <DetailItem
                label={tf("hijabPractice")}
                value={tf(`hijabPracticeOptions.${personal.hijabPractice}`)}
                {...change.item("personal.hijabPractice", undefined, {
                  optionPrefix: "hijabPracticeOptions",
                })}
              />
            )}
          <DetailItem
            label={tf("hasDisability")}
            value={fmt("hasDisability", personal.hasDisability)}
            {...change.item("personal.hasDisability", "hasDisability")}
          />
          {personal.hasDisability && (
            <DetailItem
              label={tf("disabilityInfo")}
              value={display(personal.disabilityInfo)}
              {...change.item("personal.disabilityInfo", "disabilityInfo")}
            />
          )}
          <DetailItem label={tf("educationMedium")} value={fmt("educationMedium", personal.educationMedium)} {...change.item("personal.educationMedium", "educationMedium")} />
          <DetailItem label={tf("highestQualification")} value={fmt("highestDegree", personal.highestDegree)} {...change.item("personal.highestDegree", "highestDegree")} />
          <DetailItem label={tf("institution")} value={display(personal.institution)} {...change.item("personal.institution", "institution")} />
          <DetailItem
            label={tf("educationYear")}
            value={display(personal.educationYear)}
            {...change.item("personal.educationYear", "educationYear")}
          />
          <DetailItem label={tf("subject")} value={fmt("educationSubject", personal.educationSubject)} {...change.item("personal.educationSubject", "educationSubject")} />
          <DetailItem
            label={tf("additionalEducationQualifications")}
            value={display(personal.additionalEducationQualifications)}
            {...change.item(
              "personal.additionalEducationQualifications",
              "additionalEducationQualifications",
            )}
          />
          <DetailItem label={tf("occupation")} value={fmt("occupation", personal.occupation)} {...change.item("personal.occupation", "occupation")} />
          <DetailItem label={tf("company")} value={display(personal.company)} {...change.item("personal.company", "company")} />
          <DetailItem label={tf("designation")} value={display(personal.designation)} {...change.item("personal.designation", "designation")} />
          <DetailItem
            label={tf("monthlyIncome")}
            value={fmt("monthlyIncomeRange", personal.monthlyIncomeRange)}
            {...change.item("personal.monthlyIncomeRange", "monthlyIncomeRange")}
          />
        </DetailGrid>

        <div className="mt-4 space-y-3">
          <div
            className={
              change.blockChanged("personal.current")
                ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                : undefined
            }
          >
            <p className="text-xs font-semibold uppercase text-zinc-500">
              {tf("currentAddress")}
            </p>
            <p className="mt-1 text-sm text-zinc-900">
              {formatAddressBlock(
                {
                  country: personal.currentCountry,
                  division: personal.currentDivision,
                  district: personal.currentDistrict,
                  upazila: personal.currentUpazila,
                  cityTown: personal.currentCityTown,
                  addressLine: personal.currentAddressLine,
                },
                fmt,
              )}
            </p>
          </div>
          <div
            className={
              change.blockChanged("personal.permanent")
                ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                : undefined
            }
          >
            <p className="text-xs font-semibold uppercase text-zinc-500">
              {tf("permanentAddress")}
            </p>
            <p className="mt-1 text-sm text-zinc-900">
              {personal.permanentSameAsCurrent
                ? t("sameAsCurrent")
                : formatAddressBlock(
                    {
                      country: personal.permanentCountry,
                      division: personal.permanentDivision,
                      district: personal.permanentDistrict,
                      upazila: personal.permanentUpazila,
                      cityTown: personal.permanentCityTown,
                      addressLine: personal.permanentAddressLine,
                    },
                    (key, value) =>
                      fmt(
                        key === "currentDistrict"
                          ? "permanentDistrict"
                          : key === "currentDivision"
                            ? "permanentDivision"
                            : key,
                        value,
                      ),
                  )}
            </p>
          </div>
        </div>

        {(personal.introduction || personal.biography || personal.interests) && (
          <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4">
            {personal.introduction && (
              <div
                className={
                  change.item("personal.introduction").changed
                    ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                    : undefined
                }
              >
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  {tf("introduction")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
                  {personal.introduction}
                </p>
                {change.item("personal.introduction").previousValue}
              </div>
            )}
            {personal.biography && (
              <div
                className={
                  change.item("personal.biography").changed
                    ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                    : undefined
                }
              >
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  {tf("biography")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
                  {personal.biography}
                </p>
                {change.item("personal.biography").previousValue}
              </div>
            )}
            {personal.interests && (
              <div
                className={
                  change.item("personal.interests").changed
                    ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                    : undefined
                }
              >
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  {tf("interests")}
                </p>
                <p className="mt-1 text-sm text-zinc-900">{personal.interests}</p>
                {change.item("personal.interests").previousValue}
              </div>
            )}
            {personal.hobbies.length > 0 && (
              <div
                className={
                  change.item("personal.hobbies").changed
                    ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                    : undefined
                }
              >
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  {tf("hobbies")}
                </p>
                <p className="mt-1 text-sm text-zinc-900">
                  {personal.hobbies.join(", ")}
                </p>
                {change.item("personal.hobbies").previousValue}
              </div>
            )}
          </div>
        )}
      </Section>

      {hasMaritalContent(marital) && (
        <Section title={t("maritalSection")}>
          <DetailGrid>
            {marital.expectedMarriageTimeline && (
              <DetailItem
                label={tf("expectedMarriageTimeline")}
                value={fmt(
                  "expectedMarriageTimeline",
                  marital.expectedMarriageTimeline,
                )}
                {...change.item(
                  "marital.expectedMarriageTimeline",
                  "expectedMarriageTimeline",
                )}
              />
            )}
            {showDowryExpectationField(personal.gender) &&
              marital.dowryExpectation && (
                <DetailItem
                  label={tf("dowryExpectation")}
                  value={fmt("dowryExpectation", marital.dowryExpectation)}
                  {...change.item("marital.dowryExpectation", "dowryExpectation")}
                />
              )}
            {marital.weddingCeremonyPreference && (
              <DetailItem
                label={tf("weddingCeremonyPreference")}
                value={fmt(
                  "weddingCeremonyPreference",
                  marital.weddingCeremonyPreference,
                )}
                {...change.item(
                  "marital.weddingCeremonyPreference",
                  "weddingCeremonyPreference",
                )}
              />
            )}
            {marital.expectedParenthoodTimeline && (
              <DetailItem
                label={tf("expectedParenthoodTimeline")}
                value={fmt(
                  "expectedParenthoodTimeline",
                  marital.expectedParenthoodTimeline,
                )}
                {...change.item(
                  "marital.expectedParenthoodTimeline",
                  "expectedParenthoodTimeline",
                )}
              />
            )}
            {marital.expectedKabinAmountMinBdt != null && (
              <DetailItem
                label={tf("expectedKabinAmountMin")}
                value={fmt(
                  "expectedKabinAmountMinBdt",
                  marital.expectedKabinAmountMinBdt,
                )}
                {...change.item(
                  "marital.expectedKabinAmountMinBdt",
                  "expectedKabinAmountMinBdt",
                )}
              />
            )}
            {marital.expectedKabinAmountMaxBdt != null && (
              <DetailItem
                label={tf("expectedKabinAmountMax")}
                value={fmt(
                  "expectedKabinAmountMaxBdt",
                  marital.expectedKabinAmountMaxBdt,
                )}
                {...change.item(
                  "marital.expectedKabinAmountMaxBdt",
                  "expectedKabinAmountMaxBdt",
                )}
              />
            )}
            {marital.livingArrangements && (
              <DetailItem
                label={tf("livingArrangements")}
                value={fmt("livingArrangements", marital.livingArrangements)}
                {...change.item("marital.livingArrangements", "livingArrangements")}
              />
            )}
            {showLivingArrangementsOtherField(
              personal.gender,
              marital.livingArrangements,
            ) &&
              marital.livingArrangementsOther && (
                <DetailItem
                  label={tf("livingArrangementsOther")}
                  value={display(marital.livingArrangementsOther)}
                  className="sm:col-span-2"
                  {...change.item(
                    "marital.livingArrangementsOther",
                    "livingArrangementsOther",
                  )}
                />
              )}
          </DetailGrid>
        </Section>
      )}

      {submission.familyInfo && (
        <Section title={t("familySection")}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-zinc-700">{ts("father")}</p>
              <DetailGrid>
                <DetailItem
                  label={tf("name")}
                  value={display(submission.familyInfo.fatherName)}
                  {...change.item("familyInfo.fatherName", "fatherName")}
                />
                {submission.familyInfo.fatherIsAlive && (
                  <DetailItem
                    label={tf("isAlive")}
                    value={tf(`isAliveOptions.${submission.familyInfo.fatherIsAlive}`)}
                    {...change.item("familyInfo.fatherIsAlive", undefined, {
                      optionPrefix: "isAliveOptions",
                    })}
                  />
                )}
                <DetailItem
                  label={tf("education")}
                  value={fmt("fatherEducation", submission.familyInfo.fatherEducation)}
                  {...change.item("familyInfo.fatherEducation", "fatherEducation")}
                />
                <DetailItem
                  label={tf("profession")}
                  value={fmt("fatherProfession", submission.familyInfo.fatherProfession)}
                  {...change.item("familyInfo.fatherProfession", "fatherProfession")}
                />
              </DetailGrid>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-700">{ts("mother")}</p>
              <DetailGrid>
                <DetailItem
                  label={tf("name")}
                  value={display(submission.familyInfo.motherName)}
                  {...change.item("familyInfo.motherName", "motherName")}
                />
                {submission.familyInfo.motherIsAlive && (
                  <DetailItem
                    label={tf("isAlive")}
                    value={tf(`isAliveOptions.${submission.familyInfo.motherIsAlive}`)}
                    {...change.item("familyInfo.motherIsAlive", undefined, {
                      optionPrefix: "isAliveOptions",
                    })}
                  />
                )}
                <DetailItem
                  label={tf("education")}
                  value={fmt("motherEducation", submission.familyInfo.motherEducation)}
                  {...change.item("familyInfo.motherEducation", "motherEducation")}
                />
                <DetailItem
                  label={tf("profession")}
                  value={fmt("motherProfession", submission.familyInfo.motherProfession)}
                  {...change.item("familyInfo.motherProfession", "motherProfession")}
                />
              </DetailGrid>
            </div>
            <DetailGrid>
              <DetailItem
                label={tf("familyType")}
                value={fmt("familyType", submission.familyInfo.familyType)}
                {...change.item("familyInfo.familyType", "familyType")}
              />
              <DetailItem
                label={tf("familyStatus")}
                value={fmt("familyStatus", submission.familyInfo.familyStatus)}
                {...change.item("familyInfo.familyStatus", "familyStatus")}
              />
              <DetailItem
                label={tf("familyValues")}
                value={display(submission.familyInfo.familyValues)}
                {...change.item("familyInfo.familyValues", "familyValues")}
              />
              <DetailItem
                label={tf("familyAssets")}
                value={display(submission.familyInfo.familyAssets)}
                {...change.item("familyInfo.familyAssets", "familyAssets")}
              />
            </DetailGrid>
          </div>
        </Section>
      )}

      {submission.siblings.length > 0 && (
        <Section title={ts("siblings")}>
          <ul className="space-y-3">
            {submission.siblings.map((sibling, index) => (
              <li
                key={index}
                className={`rounded-lg border bg-white p-3 ${
                  change.blockChanged(`siblings.${index}`)
                    ? "border-amber-300 bg-amber-50/40"
                    : "border-zinc-200"
                }`}
              >
                <DetailGrid>
                  <DetailItem
                    label={tf("relationship")}
                    value={fmt("relationship", sibling.relationship)}
                    {...change.item(`siblings.${index}.relationship`, "relationship")}
                  />
                  <DetailItem
                    label={tf("name")}
                    value={display(sibling.name)}
                    {...change.item(`siblings.${index}.name`, "name")}
                  />
                  <DetailItem
                    label={tf("education")}
                    value={fmt("education", sibling.education)}
                    {...change.item(`siblings.${index}.education`, "education")}
                  />
                  <DetailItem
                    label={tf("profession")}
                    value={fmt("profession", sibling.profession)}
                    {...change.item(`siblings.${index}.profession`, "profession")}
                  />
                  <DetailItem
                    label={tf("maritalStatus")}
                    value={fmt("maritalStatus", sibling.maritalStatus)}
                    {...change.item(`siblings.${index}.maritalStatus`, "maritalStatus")}
                  />
                  {sibling.maritalStatus === "married" ? (
                    <>
                      <DetailItem
                        label={tf("spouseName")}
                        value={display(sibling.spouseName)}
                        {...change.item(`siblings.${index}.spouseName`, "spouseName")}
                      />
                      <DetailItem
                        label={tf("spouseEducation")}
                        value={fmt("spouseEducation", sibling.spouseEducation)}
                        {...change.item(
                          `siblings.${index}.spouseEducation`,
                          "spouseEducation",
                        )}
                      />
                      <DetailItem
                        label={tf("spouseProfession")}
                        value={fmt("spouseProfession", sibling.spouseProfession)}
                        {...change.item(
                          `siblings.${index}.spouseProfession`,
                          "spouseProfession",
                        )}
                      />
                    </>
                  ) : null}
                </DetailGrid>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {submission.paternalRelatives.length > 0 && (
        <Section title={ts("paternalRelatives")}>
          <ul className="space-y-3">
            {submission.paternalRelatives.map((relative, index) => (
              <li
                key={index}
                className={`rounded-lg border bg-white p-3 ${
                  change.blockChanged(`paternalRelatives.${index}`)
                    ? "border-amber-300 bg-amber-50/40"
                    : "border-zinc-200"
                }`}
              >
                <DetailGrid>
                  <DetailItem
                    label={tf("relation")}
                    value={fmt("relation", relative.relation, {
                      relativeRelationGroup: "paternalRelativeRelationOptions",
                    })}
                    {...change.item(`paternalRelatives.${index}.relation`, "relation", {
                      relativeRelationGroup: "paternalRelativeRelationOptions",
                    })}
                  />
                  <DetailItem
                    label={tf("name")}
                    value={display(relative.name)}
                    {...change.item(`paternalRelatives.${index}.name`, "name")}
                  />
                  <DetailItem
                    label={tf("education")}
                    value={fmt("education", relative.education)}
                    {...change.item(`paternalRelatives.${index}.education`, "education")}
                  />
                  <DetailItem
                    label={tf("profession")}
                    value={fmt("profession", relative.profession)}
                    {...change.item(`paternalRelatives.${index}.profession`, "profession")}
                  />
                </DetailGrid>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {submission.maternalRelatives.length > 0 && (
        <Section title={ts("maternalRelatives")}>
          <ul className="space-y-3">
            {submission.maternalRelatives.map((relative, index) => (
              <li
                key={index}
                className={`rounded-lg border bg-white p-3 ${
                  change.blockChanged(`maternalRelatives.${index}`)
                    ? "border-amber-300 bg-amber-50/40"
                    : "border-zinc-200"
                }`}
              >
                <DetailGrid>
                  <DetailItem
                    label={tf("relation")}
                    value={fmt("relation", relative.relation, {
                      relativeRelationGroup: "maternalRelativeRelationOptions",
                    })}
                    {...change.item(`maternalRelatives.${index}.relation`, "relation", {
                      relativeRelationGroup: "maternalRelativeRelationOptions",
                    })}
                  />
                  <DetailItem
                    label={tf("name")}
                    value={display(relative.name)}
                    {...change.item(`maternalRelatives.${index}.name`, "name")}
                  />
                  <DetailItem
                    label={tf("education")}
                    value={fmt("education", relative.education)}
                    {...change.item(`maternalRelatives.${index}.education`, "education")}
                  />
                  <DetailItem
                    label={tf("profession")}
                    value={fmt("profession", relative.profession)}
                    {...change.item(`maternalRelatives.${index}.profession`, "profession")}
                  />
                </DetailGrid>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {submission.partnerPreference && (
        <Section title={t("partnerSection")}>
          <DetailGrid>
            <DetailItem
              label={tf("ageMin")}
              value={display(submission.partnerPreference.ageMin)}
              {...change.item("partnerPreference.ageMin", "ageMin")}
            />
            <DetailItem
              label={tf("ageMax")}
              value={display(submission.partnerPreference.ageMax)}
              {...change.item("partnerPreference.ageMax", "ageMax")}
            />
            <DetailItem
              label={tf("heightMin")}
              value={formatHeight(submission.partnerPreference.heightMinCm)}
              {...change.item("partnerPreference.heightMinCm", "heightMinCm")}
            />
            <DetailItem
              label={tf("heightMax")}
              value={formatHeight(submission.partnerPreference.heightMaxCm)}
              {...change.item("partnerPreference.heightMaxCm", "heightMaxCm")}
            />
            <DetailItem
              label={tf("weightMin")}
              value={fmt("weightMinKg", submission.partnerPreference.weightMinKg)}
              {...change.item("partnerPreference.weightMinKg", "weightMinKg")}
            />
            <DetailItem
              label={tf("weightMax")}
              value={fmt("weightMaxKg", submission.partnerPreference.weightMaxKg)}
              {...change.item("partnerPreference.weightMaxKg", "weightMaxKg")}
            />
            <DetailItem
              label={tf("minimumEducation")}
              value={fmt("minimumEducation", submission.partnerPreference.minimumEducation)}
              {...change.item("partnerPreference.minimumEducation", "minimumEducation")}
            />
            <DetailItem
              label={tf("preferredProfession")}
              value={fmt(
                "preferredProfession",
                submission.partnerPreference.preferredProfession,
              )}
              {...change.item(
                "partnerPreference.preferredProfession",
                "preferredProfession",
              )}
            />
            {submission.partnerPreference.beardPreference && (
              <DetailItem
                label={tf("beardPreference")}
                value={tf(
                  `beardPreferenceOptions.${submission.partnerPreference.beardPreference}`,
                )}
                {...change.item("partnerPreference.beardPreference", undefined, {
                  optionPrefix: "beardPreferenceOptions",
                })}
              />
            )}
            {submission.partnerPreference.prayerPreference && (
              <DetailItem
                label={tf("prayerPreference")}
                value={tf(
                  `prayerPreferenceOptions.${submission.partnerPreference.prayerPreference}`,
                )}
                {...change.item("partnerPreference.prayerPreference", undefined, {
                  optionPrefix: "prayerPreferenceOptions",
                })}
              />
            )}
            {submission.partnerPreference.hijabPreference && (
              <DetailItem
                label={tf("hijabPreference")}
                value={tf(
                  `hijabPreferenceOptions.${submission.partnerPreference.hijabPreference}`,
                )}
                {...change.item("partnerPreference.hijabPreference", undefined, {
                  optionPrefix: "hijabPreferenceOptions",
                })}
              />
            )}
            <DetailItem
              label={tf("maritalStatusPref")}
              value={fmt(
                "maritalStatusPref",
                submission.partnerPreference.maritalStatusPref,
              )}
              {...change.item("partnerPreference.maritalStatusPref", "maritalStatusPref")}
            />
            <DetailItem
              label={tf("preferredDistricts")}
              value={fmt(
                "preferredDistricts",
                submission.partnerPreference.preferredDistricts,
              )}
              {...change.item(
                "partnerPreference.preferredDistricts",
                "preferredDistricts",
              )}
            />
          </DetailGrid>
          {submission.partnerPreference.additionalNotes && (
            <div
              className={`mt-4 border-t border-zinc-200 pt-4 ${
                change.item("partnerPreference.additionalNotes").changed
                  ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                  : ""
              }`}
            >
              <p className="text-xs font-semibold uppercase text-zinc-500">
                {tf("additionalNotes")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
                {submission.partnerPreference.additionalNotes}
              </p>
              {change.item("partnerPreference.additionalNotes").previousValue}
            </div>
          )}
        </Section>
      )}

      {biodataStatus === "pending" && !readOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">{t("biodataReviewPrompt")}</p>
          <p className="mt-1 text-sm text-amber-900">{t("biodataReviewHint")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={acting?.startsWith("biodata-") ?? false}
              onClick={() => onBiodataReview("approved")}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {t("approveBiodata")}
            </button>
            <button
              type="button"
              disabled={acting?.startsWith("biodata-") ?? false}
              onClick={() =>
                onRequestBiodataReject
                  ? onRequestBiodataReject()
                  : onBiodataReview("rejected")
              }
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {t("rejectBiodata")}
            </button>
          </div>
        </div>
      )}

      <p className="text-sm font-medium text-rose-800">{t("reviewMediaBelow")}</p>
    </div>
  );
}
