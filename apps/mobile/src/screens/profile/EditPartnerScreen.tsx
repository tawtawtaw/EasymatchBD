import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import {
  BEARD_PREFERENCE_VALUES,
  HIJAB_PREFERENCE_VALUES,
  PRAYER_PREFERENCE_VALUES,
  showBeardPreferenceField,
  showHijabPreferenceField,
  showPrayerPreferenceField,
} from "@easymatch/shared";
import {
  FormDistrictMultiSelectField,
  FormMultiSelectField,
} from "../../components/form/FormMultiSelectField";
import { FormSelectField, FormTextField, FormHeightField } from "../../components/form/FormFields";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { personalFieldLabel, tProfilePartner } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import {
  buildUpdatePartnerPayload,
  readPartnerFromProfile,
  validatePartnerForm,
} from "../../lib/partner-form";
import type { EditPartnerScreenProps } from "../../navigation/types";
import { advanceAfterBiodataSave } from "../../lib/biodata-navigation";
import { getProfileEditorBootstrap, updatePartner } from "../../services/profile";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import { buildDropdownOptions } from "../../lib/dropdown-options";
import type { DropdownMap } from "../../types/dropdowns";
import type { MemberProfile, PartnerFormState } from "../../types/profile";
import { colors } from "../../theme/colors";

function options(dropdowns: DropdownMap, key: string) {
  return (dropdowns[key] ?? []).map((item) => ({ value: item.value, label: item.label }));
}

function preferenceOptions(
  dropdowns: DropdownMap,
  category: string,
  fallbackValues: readonly string[],
  labelFor: (value: string) => string,
) {
  if (dropdowns[category]?.length) {
    return dropdowns[category].map((item) => ({ value: item.value, label: item.label }));
  }
  return fallbackValues.map((value) => ({ value, label: labelFor(value) }));
}

export default function EditPartnerScreen({ navigation }: EditPartnerScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const onboardingPhase = useOnboardingStore((s) => s.phase);
  const refreshOnboarding = useOnboardingStore((s) => s.refresh);
  const isOnboardingSetup = onboardingPhase === "profile_setup";
  const copy = tProfilePartner(locale);
  const [form, setForm] = useState<PartnerFormState | null>(null);
  const [personalProfile, setPersonalProfile] = useState<MemberProfile | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const beardOptions = useMemo(
    () =>
      preferenceOptions(dropdowns, "beard_preference", BEARD_PREFERENCE_VALUES, (value) => {
        if (value === "yes") return copy.beardPreferenceYes;
        if (value === "no") return copy.beardPreferenceNo;
        return copy.beardPreferenceNoOpinion;
      }),
    [copy, dropdowns],
  );

  const prayerOptions = useMemo(
    () =>
      preferenceOptions(dropdowns, "prayer_preference", PRAYER_PREFERENCE_VALUES, (value) => {
        if (value === "regular_five_times") return copy.prayerPreferenceRegular;
        if (value === "modestly_practicing") return copy.prayerPreferenceModest;
        return copy.prayerPreferenceNoOpinion;
      }),
    [copy, dropdowns],
  );

  const hijabOptions = useMemo(
    () =>
      buildDropdownOptions(
        dropdowns,
        "hijab_preference",
        locale,
        HIJAB_PREFERENCE_VALUES,
      ),
    [dropdowns, locale],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfileEditorBootstrap(locale);
      if (!data.profile || !data.dropdowns) throw new Error(copy.loadError);
      setDropdowns(data.dropdowns);
      setPersonalProfile(data.profile);
      setForm(readPartnerFromProfile(data.profile));
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, locale]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = useCallback(async () => {
    if (!form || !personalProfile) return;
    const validationError = validatePartnerForm(form, {
      ageMinRequired: copy.ageMinRequired,
      ageInvalid: copy.ageInvalid,
      ageRange: copy.ageRange,
      weightInvalid: copy.weightInvalid,
      weightRange: copy.weightRange,
    });
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updatePartner(
        buildUpdatePartnerPayload(form, {
          religion: personalProfile.religion ?? "",
          gender: personalProfile.gender ?? "",
        }),
      );
      setMessage(copy.saved);
      await advanceAfterBiodataSave({
        navigation,
        currentScreen: "EditPartner",
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
    copy.ageInvalid,
    copy.ageMinRequired,
    copy.ageRange,
    copy.saved,
    copy.saveError,
    copy.weightInvalid,
    copy.weightRange,
    form,
    isOnboardingSetup,
    locale,
    navigation,
    personalProfile,
    refreshOnboarding,
    refreshSession,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: copy.title,
      headerRight: () => (
        <Pressable onPress={() => void save()} disabled={saving} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>{saving ? copy.saving : copy.save}</Text>
        </Pressable>
      ),
    });
  }, [copy.save, copy.saving, copy.title, navigation, save, saving]);

  if (loading) return <LoadingState label={copy.loading} />;
  if (error && !form) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!form || !personalProfile) return null;

  const patch = (partial: Partial<PartnerFormState>) => setForm((c) => (c ? { ...c, ...partial } : c));
  const personalReligion = personalProfile.religion ?? "";
  const personalGender = personalProfile.gender ?? "";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FormTextField
        label={copy.ageMin}
        value={form.ageMin}
        onChange={(v) => patch({ ageMin: v })}
        keyboardType="number-pad"
        required
      />
      <FormTextField
        label={copy.ageMax}
        value={form.ageMax}
        onChange={(v) => patch({ ageMax: v })}
        keyboardType="number-pad"
      />
      <FormHeightField
        label={copy.heightMin}
        feetLabel={copy.heightFeet}
        inchesLabel={copy.heightInches}
        selectLabel={copy.select}
        feet={form.heightMinFeet}
        inches={form.heightMinInches}
        onFeetChange={(v) => patch({ heightMinFeet: v })}
        onInchesChange={(v) => patch({ heightMinInches: v })}
      />
      <FormHeightField
        label={copy.heightMax}
        feetLabel={copy.heightFeet}
        inchesLabel={copy.heightInches}
        selectLabel={copy.select}
        feet={form.heightMaxFeet}
        inches={form.heightMaxInches}
        onFeetChange={(v) => patch({ heightMaxFeet: v })}
        onInchesChange={(v) => patch({ heightMaxInches: v })}
      />
      <FormTextField
        label={copy.weightMin}
        value={form.weightMinKg}
        onChange={(v) => patch({ weightMinKg: v })}
        keyboardType="number-pad"
      />
      <FormTextField
        label={copy.weightMax}
        value={form.weightMaxKg}
        onChange={(v) => patch({ weightMaxKg: v })}
        keyboardType="number-pad"
      />
      <FormDistrictMultiSelectField
        label={copy.preferredDistricts}
        hint={copy.preferredDistrictsHint}
        filterLabel={copy.filterDistrictsByDivision}
        allDivisionsLabel={copy.allDivisions}
        clearLabel={copy.clearDistricts}
        selectedCountLabel={(count) => copy.districtsSelected.replace("{count}", String(count))}
        selected={form.preferredDistricts}
        onChange={(preferredDistricts) => patch({ preferredDistricts })}
        districts={dropdowns.district ?? []}
        divisions={dropdowns.division ?? []}
        placeholder={copy.select}
      />
      <FormSelectField
        label={copy.minimumEducation}
        value={form.minimumEducation}
        onChange={(v) => patch({ minimumEducation: v })}
        options={options(dropdowns, "education")}
        placeholder={copy.select}
      />
      <FormMultiSelectField
        label={copy.preferredProfession}
        hint={copy.preferredProfessionsHint}
        selected={form.preferredProfession}
        onChange={(preferredProfession) => patch({ preferredProfession })}
        options={options(dropdowns, "occupation")}
        allowCustom
        customLabel={copy.customProfession}
        addCustomLabel={copy.addProfession}
        customPlaceholder={copy.customValue}
        clearLabel={copy.clearProfessions}
        selectedCountLabel={copy.professionsSelected.replace(
          "{count}",
          String(form.preferredProfession.length),
        )}
      />
      {showBeardPreferenceField(personalReligion, personalGender) ? (
        <FormSelectField
          label={copy.beardPreference}
          value={form.beardPreference}
          onChange={(v) => patch({ beardPreference: v })}
          options={beardOptions}
          placeholder={copy.select}
        />
      ) : null}
      {showPrayerPreferenceField(personalReligion) ? (
        <FormSelectField
          label={copy.prayerPreference}
          value={form.prayerPreference}
          onChange={(v) => patch({ prayerPreference: v })}
          options={prayerOptions}
          placeholder={copy.select}
        />
      ) : null}
      {showHijabPreferenceField(personalReligion, personalGender) ? (
        <FormSelectField
          label={copy.hijabPreference}
          value={form.hijabPreference}
          onChange={(v) => patch({ hijabPreference: v })}
          options={hijabOptions}
          placeholder={copy.select}
        />
      ) : null}
      <FormMultiSelectField
        label={personalFieldLabel(locale, "marital_status")}
        hint={copy.maritalStatusPrefHint}
        selected={form.maritalStatusPref}
        onChange={(maritalStatusPref) => patch({ maritalStatusPref })}
        options={options(dropdowns, "marital_status")}
        clearLabel={copy.clearMaritalStatuses}
        selectedCountLabel={copy.maritalStatusesSelected.replace(
          "{count}",
          String(form.maritalStatusPref.length),
        )}
      />
      <FormTextField
        label={copy.additionalNotes}
        value={form.additionalNotes}
        onChange={(v) => patch({ additionalNotes: v })}
        multiline
      />

      <Pressable style={[styles.saveBtn, saving && styles.disabled]} onPress={() => void save()} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? copy.saving : copy.save}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 16, paddingBottom: 32 },
  headerBtn: { marginRight: 8, padding: 4 },
  headerBtnText: { color: colors.white, fontWeight: "700" },
  success: { marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: "#ecfdf5", color: colors.emerald600, fontSize: 13, fontWeight: "600" },
  error: { marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: "#fef2f2", color: colors.red600, fontSize: 13 },
  saveBtn: { marginTop: 8, borderRadius: 999, backgroundColor: colors.rose800, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.7 },
});
