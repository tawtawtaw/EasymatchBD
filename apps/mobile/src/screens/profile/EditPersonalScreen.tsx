import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ADDRESS_COUNTRY_OPTIONS,
  HAS_BEARD_VALUES,
  HIJAB_PRACTICE_VALUES,
  PRAYER_PRACTICE_VALUES,
  SMOKING_HABIT_VALUES,
  isIslamReligion,
  sanitizeChildrenCountInput,
  showHasBeardField,
  showHijabPracticeField,
  showSmokingHabitField,
} from "@easymatch/shared";
import { AddressFields, FormCheckbox } from "../../components/form/AddressFields";
import { FormSectionTitle, FormSelectField, FormTextField, FormHeightField, FormDateOfBirthField } from "../../components/form/FormFields";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { personalFieldLabel, tProfileEditor } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import {
  buildUpdatePersonalPayload,
  emptyPersonalForm,
  isDivorcedMaritalStatus,
  profileToPersonalForm,
  requiresChildrenCountMaritalStatus,
  validatePersonalForm,
} from "../../lib/profile-form";
import type { EditPersonalScreenProps } from "../../navigation/types";
import { advanceAfterBiodataSave } from "../../lib/biodata-navigation";
import { buildDropdownOptions } from "../../lib/dropdown-options";
import { getProfileEditorBootstrap, updatePersonal } from "../../services/profile";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import type { DropdownMap } from "../../types/dropdowns";
import type { MemberProfile, PersonalFormState } from "../../types/profile";
import { colors } from "../../theme/colors";

export default function EditPersonalScreen({ navigation }: EditPersonalScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const onboardingPhase = useOnboardingStore((s) => s.phase);
  const refreshOnboarding = useOnboardingStore((s) => s.refresh);
  const isOnboardingSetup = onboardingPhase === "profile_setup";
  const copy = tProfileEditor(locale);
  const field = (key: string) => personalFieldLabel(locale, key);

  const [form, setForm] = useState<PersonalFormState>(emptyPersonalForm());
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const countries = useMemo(
    () => [
      { value: "Bangladesh", label: "Bangladesh" },
      ...ADDRESS_COUNTRY_OPTIONS.filter((country) => country !== "Bangladesh")
        .sort((a, b) => a.localeCompare(b))
        .map((country) => ({ value: country, label: country })),
    ],
    [],
  );

  const addressLabels = {
    country: copy.country,
    division: copy.division,
    district: copy.district,
    upazila: copy.upazila,
    cityTown: copy.cityTown,
    addressLine: copy.addressLine,
    select: copy.select,
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfileEditorBootstrap(locale);
      if (!data.profile || !data.dropdowns) {
        throw new Error(copy.loadError);
      }
      setProfile(data.profile);
      setDropdowns(data.dropdowns);
      setForm(profileToPersonalForm(data.profile));
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, locale]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleSave = useCallback(async () => {
    const validationError = validatePersonalForm(form, {
      dateOfBirthRequired: copy.dateOfBirthRequired,
      dateOfBirthInvalid: copy.dateOfBirthInvalid,
      prayerPracticeRequired: copy.prayerPracticeRequired,
      introductionRequired: copy.introductionRequired,
      childrenCountRequired: copy.childrenCountRequired,
      childrenCountInvalid: copy.childrenCountInvalid,
      childrenCountMax: copy.childrenCountMax,
      smokingHabitRequired: copy.smokingHabitRequired,
      weightInvalid: copy.weightInvalid,
      weightRange: copy.weightRange,
      heightInvalid: copy.heightInvalid,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updatePersonal(buildUpdatePersonalPayload(form));
      setProfile(updated);
      setForm(profileToPersonalForm(updated));
      setMessage(copy.saved);
      await advanceAfterBiodataSave({
        navigation,
        currentScreen: "EditPersonal",
        locale,
        isOnboardingSetup,
        refreshOnboarding,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.saveError));
    } finally {
      setSaving(false);
    }
  }, [
    copy.childrenCountInvalid,
    copy.childrenCountMax,
    copy.childrenCountRequired,
    copy.smokingHabitRequired,
    copy.dateOfBirthInvalid,
    copy.dateOfBirthRequired,
    copy.heightInvalid,
    copy.introductionRequired,
    copy.prayerPracticeRequired,
    copy.saved,
    copy.saveError,
    copy.weightInvalid,
    copy.weightRange,
    form,
    isOnboardingSetup,
    locale,
    navigation,
    refreshOnboarding,
    refreshSession,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: copy.title,
      headerRight: () => (
        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>{saving ? copy.saving : copy.save}</Text>
        </Pressable>
      ),
    });
  }, [copy.save, copy.saving, copy.title, handleSave, navigation, saving]);

  function patch(partial: Partial<PersonalFormState>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  if (loading) {
    return <LoadingState label={copy.loading} />;
  }

  if (error && !profile) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  const nameLocked = Boolean(profile?.nidVerifiedAt);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FormTextField
        label={copy.fullName}
        value={form.fullName}
        onChange={(value) => patch({ fullName: value })}
        disabled={nameLocked}
        hint={nameLocked ? copy.fullNameLocked : undefined}
      />
      <FormSelectField
        label={field("gender")}
        value={form.gender}
        onChange={(gender) => {
          const next: Partial<PersonalFormState> = { gender };
          if (!showHasBeardField(form.religion, gender)) next.hasBeard = "";
          if (!showSmokingHabitField(gender)) next.smokingHabit = "";
          if (!showHijabPracticeField(form.religion, gender)) next.hijabPractice = "";
          patch(next);
        }}
        options={buildDropdownOptions(dropdowns, "gender", locale)}
        placeholder={copy.select}
        required
      />
      <FormDateOfBirthField
        label={copy.dateOfBirth}
        value={form.dateOfBirth}
        onChange={(dateOfBirth) => patch({ dateOfBirth })}
        placeholder={copy.datePlaceholder}
        required
      />
      <FormSelectField
        label={field("marital_status")}
        value={form.maritalStatus}
        onChange={(maritalStatus) =>
          patch({
            maritalStatus,
            divorceDetails: isDivorcedMaritalStatus(maritalStatus)
              ? form.divorceDetails
              : "",
            childrenCount: requiresChildrenCountMaritalStatus(maritalStatus)
              ? form.childrenCount
              : "",
          })
        }
        options={buildDropdownOptions(dropdowns, "marital_status", locale)}
        placeholder={copy.select}
        required
      />
      {isDivorcedMaritalStatus(form.maritalStatus) ? (
        <FormTextField
          label={copy.divorceDetails}
          value={form.divorceDetails}
          onChange={(divorceDetails) => patch({ divorceDetails })}
          multiline
        />
      ) : null}
      {requiresChildrenCountMaritalStatus(form.maritalStatus) ? (
        <FormTextField
          label={copy.childrenCount}
          value={form.childrenCount}
          onChange={(childrenCount) =>
            patch({ childrenCount: sanitizeChildrenCountInput(childrenCount) })
          }
          keyboardType="number-pad"
          required
        />
      ) : null}

      <FormHeightField
        label={copy.height}
        feetLabel={copy.heightFeet}
        inchesLabel={copy.heightInches}
        selectLabel={copy.select}
        feet={form.heightFeet}
        inches={form.heightInches}
        onFeetChange={(heightFeet) => patch({ heightFeet })}
        onInchesChange={(heightInches) => patch({ heightInches })}
      />
      <FormTextField
        label={copy.weightKg}
        value={form.weightKg}
        onChange={(weightKg) => patch({ weightKg: weightKg.replace(/\D/g, "") })}
        keyboardType="number-pad"
        keyboardType="number-pad"
      />
      <FormSelectField
        label={field("complexion")}
        value={form.complexion}
        onChange={(complexion) => patch({ complexion })}
        options={buildDropdownOptions(dropdowns, "complexion", locale)}
        placeholder={copy.select}
      />
      <FormCheckbox
        label={copy.hasDisability}
        checked={form.hasDisability}
        onChange={(hasDisability) =>
          patch({
            hasDisability,
            disabilityInfo: hasDisability ? form.disabilityInfo : "",
          })
        }
      />
      {form.hasDisability ? (
        <FormTextField
          label={copy.disabilityInfo}
          value={form.disabilityInfo}
          onChange={(disabilityInfo) => patch({ disabilityInfo })}
          multiline
        />
      ) : null}
      <FormSelectField
        label={field("religion")}
        value={form.religion}
        onChange={(religion) => {
          const next: Partial<PersonalFormState> = { religion };
          if (!isIslamReligion(religion)) {
            next.hasBeard = "";
            next.prayerPractice = "";
            next.hijabPractice = "";
          }
          patch(next);
        }}
        options={buildDropdownOptions(dropdowns, "religion", locale)}
        placeholder={copy.select}
        required
      />

      {isIslamReligion(form.religion) ? (
        <FormSelectField
          label={copy.prayerPractice}
          value={form.prayerPractice}
          onChange={(prayerPractice) => patch({ prayerPractice })}
          options={buildDropdownOptions(
            dropdowns,
            "prayer_practice",
            locale,
            PRAYER_PRACTICE_VALUES,
          )}
          placeholder={copy.select}
          required
        />
      ) : null}
      {showHasBeardField(form.religion, form.gender) ? (
        <FormSelectField
          label={copy.hasBeard}
          value={form.hasBeard}
          onChange={(hasBeard) => patch({ hasBeard })}
          options={buildDropdownOptions(
            dropdowns,
            "has_beard",
            locale,
            HAS_BEARD_VALUES,
          )}
          placeholder={copy.select}
        />
      ) : null}
      {showSmokingHabitField(form.gender) ? (
        <FormSelectField
          label={copy.smokingHabit}
          value={form.smokingHabit}
          onChange={(smokingHabit) => patch({ smokingHabit })}
          options={buildDropdownOptions(
            dropdowns,
            "smoking_habit",
            locale,
            SMOKING_HABIT_VALUES,
          )}
          placeholder={copy.select}
          required
        />
      ) : null}
      {showHijabPracticeField(form.religion, form.gender) ? (
        <FormSelectField
          label={copy.hijabPractice}
          value={form.hijabPractice}
          onChange={(hijabPractice) => patch({ hijabPractice })}
          options={buildDropdownOptions(
            dropdowns,
            "hijab_practice",
            locale,
            HIJAB_PRACTICE_VALUES,
          )}
          placeholder={copy.select}
        />
      ) : null}

      <FormSelectField
        label={copy.educationMedium}
        value={form.educationMedium}
        onChange={(educationMedium) => patch({ educationMedium })}
        options={buildDropdownOptions(dropdowns, "education_medium", locale)}
        placeholder={copy.select}
        required
        allowCustom
        otherLabel={copy.other}
        customPlaceholder={copy.customValue}
      />
      <FormSelectField
        label={copy.highestQualification}
        value={form.highestDegree}
        onChange={(highestDegree) => patch({ highestDegree })}
        options={buildDropdownOptions(dropdowns, "education", locale)}
        placeholder={copy.select}
        required
        allowCustom
        otherLabel={copy.other}
        customPlaceholder={copy.customValue}
      />
      <FormTextField
        label={copy.institution}
        value={form.institution}
        onChange={(institution) => patch({ institution })}
      />
      <FormTextField
        label={copy.educationYear}
        value={form.educationYear}
        onChange={(educationYear) => patch({ educationYear })}
        keyboardType="number-pad"
      />
      <FormSelectField
        label={copy.subject}
        value={form.educationSubject}
        onChange={(educationSubject) => patch({ educationSubject })}
        options={buildDropdownOptions(dropdowns, "education_subject", locale)}
        placeholder={copy.select}
        allowCustom
        otherLabel={copy.other}
        customPlaceholder={copy.customValue}
      />
      <FormTextField
        label={copy.additionalEducation}
        value={form.additionalEducationQualifications}
        onChange={(additionalEducationQualifications) =>
          patch({ additionalEducationQualifications })
        }
        multiline
      />
      <FormSelectField
        label={field("occupation")}
        value={form.occupation}
        onChange={(occupation) => patch({ occupation })}
        options={buildDropdownOptions(dropdowns, "occupation", locale)}
        placeholder={copy.select}
        required
        allowCustom
        otherLabel={copy.other}
        customPlaceholder={copy.customValue}
      />
      <FormTextField
        label={copy.company}
        value={form.company}
        onChange={(company) => patch({ company })}
      />
      <FormTextField
        label={copy.designation}
        value={form.designation}
        onChange={(designation) => patch({ designation })}
      />
      <FormSelectField
        label={copy.monthlyIncome}
        value={form.monthlyIncomeRange}
        onChange={(monthlyIncomeRange) => patch({ monthlyIncomeRange })}
        options={buildDropdownOptions(dropdowns, "income_range", locale)}
        placeholder={copy.select}
      />

      <FormSectionTitle title={copy.currentAddress} />
      <AddressFields
        labels={addressLabels}
        divisions={dropdowns.division ?? []}
        districts={dropdowns.district ?? []}
        upazilas={dropdowns.upazila ?? []}
        countries={countries}
        value={{
          country: form.currentCountry,
          division: form.currentDivision,
          district: form.currentDistrict,
          upazila: form.currentUpazila,
          cityTown: form.currentCityTown,
          addressLine: form.currentAddressLine,
        }}
        onChange={(address) =>
          patch({
            currentCountry: address.country,
            currentDivision: address.division,
            currentDistrict: address.district,
            currentUpazila: address.upazila,
            currentCityTown: address.cityTown,
            currentAddressLine: address.addressLine,
          })
        }
      />

      <FormSectionTitle title={copy.permanentAddress} />
      <FormCheckbox
        label={copy.permanentSame}
        checked={form.permanentSameAsCurrent}
        onChange={(permanentSameAsCurrent) => patch({ permanentSameAsCurrent })}
      />
      {!form.permanentSameAsCurrent ? (
        <AddressFields
          labels={addressLabels}
          divisions={dropdowns.division ?? []}
          districts={dropdowns.district ?? []}
          upazilas={dropdowns.upazila ?? []}
          countries={countries}
          value={{
            country: form.permanentCountry,
            division: form.permanentDivision,
            district: form.permanentDistrict,
            upazila: form.permanentUpazila,
            cityTown: form.permanentCityTown,
            addressLine: form.permanentAddressLine,
          }}
          onChange={(address) =>
            patch({
              permanentCountry: address.country,
              permanentDivision: address.division,
              permanentDistrict: address.district,
              permanentUpazila: address.upazila,
              permanentCityTown: address.cityTown,
              permanentAddressLine: address.addressLine,
            })
          }
        />
      ) : null}

      <FormTextField
        label={copy.introduction}
        value={form.introduction}
        onChange={(introduction) => patch({ introduction })}
        multiline
        required
        hint={copy.introductionHint}
      />
      <FormTextField
        label={copy.biography}
        value={form.biography}
        onChange={(biography) => patch({ biography })}
        multiline
        hint={copy.biographyHint}
      />
      <FormTextField
        label={copy.hobbies}
        value={form.hobbies}
        onChange={(hobbies) => patch({ hobbies })}
        hint={copy.hobbiesHint}
      />
      <FormTextField
        label={copy.interests}
        value={form.interests}
        onChange={(interests) => patch({ interests })}
        hint={copy.interestsHint}
      />

      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={() => void handleSave()}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? copy.saving : copy.save}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 16, paddingBottom: 32 },
  headerButton: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  success: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    color: colors.emerald600,
    fontSize: 13,
    fontWeight: "600",
  },
  error: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
