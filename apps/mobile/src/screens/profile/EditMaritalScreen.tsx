import { useFocusEffect } from "@react-navigation/native";
import {
  EXPECTED_MARRIAGE_TIMELINE_VALUES,
  EXPECTED_PARENTHOOD_TIMELINE_VALUES,
  DOWRY_EXPECTATION_VALUES,
  WEDDING_CEREMONY_PREFERENCE_VALUES,
  LIVING_ARRANGEMENTS_FEMALE_VALUES,
  LIVING_ARRANGEMENTS_MALE_VALUES,
  getLivingArrangementsDropdownCategory,
  LIVING_ARRANGEMENTS_OTHER_MALE_VALUE,
  showDowryExpectationField,
  showLivingArrangementsOtherField,
} from "@easymatch/shared";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { FormSelectField, FormTextField } from "../../components/form/FormFields";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { tProfileMarital } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import {
  buildUpdateMaritalPayload,
  emptyMaritalForm,
  isValidExpectedKabinAmountRange,
  parseExpectedKabinAmountInput,
  profileToMaritalForm,
} from "../../lib/marital-form";
import type { EditMaritalScreenProps } from "../../navigation/types";
import { advanceAfterBiodataSave } from "../../lib/biodata-navigation";
import { getProfileEditorBootstrap, updateMarital } from "../../services/profile";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import { buildDropdownOptions } from "../../lib/dropdown-options";
import type { DropdownMap } from "../../types/dropdowns";
import type { MaritalFormState, MemberProfile } from "../../types/profile";
import { colors } from "../../theme/colors";

export default function EditMaritalScreen({ navigation }: EditMaritalScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const onboardingPhase = useOnboardingStore((s) => s.phase);
  const refreshOnboarding = useOnboardingStore((s) => s.refresh);
  const isOnboardingSetup = onboardingPhase === "profile_setup";
  const copy = tProfileMarital(locale);

  const [form, setForm] = useState<MaritalFormState>(emptyMaritalForm());
  const [gender, setGender] = useState("");
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const livingCategory = getLivingArrangementsDropdownCategory(gender);
  const livingFallback = useMemo(
    () =>
      gender === "male"
        ? LIVING_ARRANGEMENTS_MALE_VALUES
        : LIVING_ARRANGEMENTS_FEMALE_VALUES,
    [gender],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfileEditorBootstrap(locale);
      if (!data.profile || !data.dropdowns) throw new Error(copy.loadError);
      setDropdowns(data.dropdowns);
      setGender(data.profile.gender ?? "");
      setForm(profileToMaritalForm(data.profile as MemberProfile));
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, locale]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const patch = (partial: Partial<MaritalFormState>) =>
    setForm((current) => ({ ...current, ...partial }));

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const kabinMin = parseExpectedKabinAmountInput(form.expectedKabinAmountMinBdt);
      const kabinMax = parseExpectedKabinAmountInput(form.expectedKabinAmountMaxBdt);
      if (kabinMin === undefined || kabinMax === undefined) {
        setError(copy.expectedKabinAmountInvalid);
        return;
      }
      if (!isValidExpectedKabinAmountRange(kabinMin, kabinMax)) {
        setError(copy.expectedKabinAmountRange);
        return;
      }
      await updateMarital(buildUpdateMaritalPayload(form, gender));
      setMessage(copy.saved);
      await advanceAfterBiodataSave({
        navigation,
        currentScreen: "EditMarital",
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
    copy.expectedKabinAmountInvalid,
    copy.expectedKabinAmountRange,
    form,
    gender,
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
  if (error && !gender) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FormSelectField
        label={copy.expectedMarriageTimeline}
        value={form.expectedMarriageTimeline}
        onChange={(expectedMarriageTimeline) => patch({ expectedMarriageTimeline })}
        options={buildDropdownOptions(
          dropdowns,
          "expected_marriage_timeline",
          locale,
          EXPECTED_MARRIAGE_TIMELINE_VALUES,
        )}
        placeholder={copy.select}
      />
      {showDowryExpectationField(gender) ? (
        <FormSelectField
          label={copy.dowryExpectation}
          value={form.dowryExpectation}
          onChange={(dowryExpectation) => patch({ dowryExpectation })}
          options={buildDropdownOptions(
            dropdowns,
            "dowry_expectation",
            locale,
            DOWRY_EXPECTATION_VALUES,
          )}
          placeholder={copy.select}
        />
      ) : null}
      <FormSelectField
        label={copy.weddingCeremonyPreference}
        value={form.weddingCeremonyPreference}
        onChange={(weddingCeremonyPreference) => patch({ weddingCeremonyPreference })}
        options={buildDropdownOptions(
          dropdowns,
          "wedding_ceremony_preference",
          locale,
          WEDDING_CEREMONY_PREFERENCE_VALUES,
        )}
        placeholder={copy.select}
      />
      <FormSelectField
        label={copy.expectedParenthoodTimeline}
        value={form.expectedParenthoodTimeline}
        onChange={(expectedParenthoodTimeline) => patch({ expectedParenthoodTimeline })}
        options={buildDropdownOptions(
          dropdowns,
          "expected_parenthood_timeline",
          locale,
          EXPECTED_PARENTHOOD_TIMELINE_VALUES,
        )}
        placeholder={copy.select}
      />
      {livingCategory ? (
        <FormSelectField
          label={copy.livingArrangements}
          value={form.livingArrangements}
          onChange={(livingArrangements) =>
            patch({
              livingArrangements,
              livingArrangementsOther:
                livingArrangements === LIVING_ARRANGEMENTS_OTHER_MALE_VALUE
                  ? form.livingArrangementsOther
                  : "",
            })
          }
          options={buildDropdownOptions(
            dropdowns,
            livingCategory,
            locale,
            livingFallback,
          )}
          placeholder={copy.select}
        />
      ) : null}
      {showLivingArrangementsOtherField(gender, form.livingArrangements) ? (
        <FormTextField
          label={copy.livingArrangementsOther}
          value={form.livingArrangementsOther}
          onChange={(livingArrangementsOther) => patch({ livingArrangementsOther })}
          multiline
        />
      ) : null}
      <Text style={styles.groupLabel}>{copy.expectedKabinAmount}</Text>
      <FormTextField
        label={copy.expectedKabinAmountMin}
        value={form.expectedKabinAmountMinBdt}
        onChange={(expectedKabinAmountMinBdt) => patch({ expectedKabinAmountMinBdt })}
        keyboardType="number-pad"
      />
      <FormTextField
        label={copy.expectedKabinAmountMax}
        value={form.expectedKabinAmountMaxBdt}
        onChange={(expectedKabinAmountMaxBdt) => patch({ expectedKabinAmountMaxBdt })}
        keyboardType="number-pad"
      />
      <Text style={styles.hint}>{copy.expectedKabinAmountHint}</Text>

      <Pressable
        style={[styles.saveBtn, saving && styles.disabled]}
        onPress={() => void save()}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? copy.saving : copy.save}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  headerBtn: { marginRight: 8, padding: 4 },
  headerBtnText: { color: colors.white, fontWeight: "700" },
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
  groupLabel: { fontSize: 15, fontWeight: "600", color: colors.zinc900, marginTop: 4 },
  hint: { fontSize: 12, color: colors.zinc500, marginTop: -4 },
  saveBtn: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.7 },
});
