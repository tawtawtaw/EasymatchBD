import { useFocusEffect } from "@react-navigation/native";
import { IS_ALIVE_VALUES } from "@easymatch/shared";
import { useCallback, useLayoutEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { FormSectionTitle, FormSelectField, FormTextField } from "../../components/form/FormFields";
import { FamilyExtendedSections } from "../../components/FamilyExtendedSections";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { tProfileFamily } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import {
  buildUpdateFamilyPayload,
  readFamilyFromProfile,
} from "../../lib/family-form";
import type { EditFamilyScreenProps } from "../../navigation/types";
import { advanceAfterBiodataSave } from "../../lib/biodata-navigation";
import { getProfileEditorBootstrap, updateFamily } from "../../services/profile";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import type { DropdownMap } from "../../types/dropdowns";
import type { FamilyFormState } from "../../types/profile";
import { colors } from "../../theme/colors";

function options(dropdowns: DropdownMap, key: string, fallback?: readonly string[]) {
  if (dropdowns[key]?.length) {
    return dropdowns[key].map((item) => ({ value: item.value, label: item.label }));
  }
  return (fallback ?? []).map((value) => ({ value, label: value }));
}

export default function EditFamilyScreen({ navigation }: EditFamilyScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const onboardingPhase = useOnboardingStore((s) => s.phase);
  const refreshOnboarding = useOnboardingStore((s) => s.refresh);
  const isOnboardingSetup = onboardingPhase === "profile_setup";
  const copy = tProfileFamily(locale);
  const [form, setForm] = useState<FamilyFormState | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfileEditorBootstrap(locale);
      if (!data.profile || !data.dropdowns) throw new Error(copy.loadError);
      setDropdowns(data.dropdowns);
      setForm(readFamilyFromProfile(data.profile));
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, locale]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateFamily(buildUpdateFamilyPayload(form));
      setMessage(copy.saved);
      await refreshSession();
      await advanceAfterBiodataSave({
        navigation,
        currentScreen: "EditFamily",
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
    copy.saved,
    copy.saveError,
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
        <Pressable onPress={() => void save()} disabled={saving} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>{saving ? copy.saving : copy.save}</Text>
        </Pressable>
      ),
    });
  }, [copy.save, copy.saving, copy.title, navigation, save, saving]);

  if (loading) return <LoadingState label={copy.loading} />;
  if (error && !form) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!form) return null;

  const patch = (partial: Partial<FamilyFormState>) => setForm((c) => (c ? { ...c, ...partial } : c));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FormSectionTitle title={copy.fatherSection} />
      <FormTextField label={copy.fatherName} value={form.fatherName} onChange={(v) => patch({ fatherName: v })} />
      <FormSelectField label={copy.fatherAlive} value={form.fatherIsAlive} onChange={(v) => patch({ fatherIsAlive: v })} options={options(dropdowns, "is_alive", IS_ALIVE_VALUES)} placeholder={copy.select} />
      <FormSelectField label={copy.fatherEducation} value={form.fatherEducation} onChange={(v) => patch({ fatherEducation: v })} options={options(dropdowns, "education")} placeholder={copy.select} allowCustom otherLabel={copy.other} customPlaceholder={copy.customValue} />
      <FormSelectField label={copy.fatherProfession} value={form.fatherProfession} onChange={(v) => patch({ fatherProfession: v })} options={options(dropdowns, "occupation")} placeholder={copy.select} required allowCustom otherLabel={copy.other} customPlaceholder={copy.customValue} />

      <FormSectionTitle title={copy.motherSection} />
      <FormTextField label={copy.motherName} value={form.motherName} onChange={(v) => patch({ motherName: v })} />
      <FormSelectField label={copy.motherAlive} value={form.motherIsAlive} onChange={(v) => patch({ motherIsAlive: v })} options={options(dropdowns, "is_alive", IS_ALIVE_VALUES)} placeholder={copy.select} />
      <FormSelectField label={copy.motherEducation} value={form.motherEducation} onChange={(v) => patch({ motherEducation: v })} options={options(dropdowns, "education")} placeholder={copy.select} allowCustom otherLabel={copy.other} customPlaceholder={copy.customValue} />
      <FormSelectField label={copy.motherProfession} value={form.motherProfession} onChange={(v) => patch({ motherProfession: v })} options={options(dropdowns, "occupation")} placeholder={copy.select} required allowCustom otherLabel={copy.other} customPlaceholder={copy.customValue} />

      <FormSectionTitle title={copy.familySection} />
      <FormSelectField label={copy.familyType} value={form.familyType} onChange={(v) => patch({ familyType: v })} options={options(dropdowns, "family_type")} placeholder={copy.select} />
      <FormSelectField label={copy.familyStatus} value={form.familyStatus} onChange={(v) => patch({ familyStatus: v })} options={options(dropdowns, "family_status")} placeholder={copy.select} />
      <FormTextField label={copy.familyValues} value={form.familyValues} onChange={(v) => patch({ familyValues: v })} multiline />
      <FormTextField label={copy.familyAssets} value={form.familyAssets} onChange={(v) => patch({ familyAssets: v })} multiline />

      <FamilyExtendedSections
        form={form}
        dropdowns={dropdowns}
        locale={locale}
        copy={copy}
        onChange={setForm}
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
