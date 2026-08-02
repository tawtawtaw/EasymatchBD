import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ON_BEHALF_RELATIONS,
  PROFILE_CREATION_MODES,
  type OnBehalfRelation,
  type ProfileCreationMode,
} from "@easymatch/shared";
import { tOnboardingCreationIntent } from "../../i18n/onboarding";
import { getApiErrorMessage } from "../../lib/api-error";
import { computeOnboardingPhase } from "../../lib/member-onboarding";
import { setCreationIntent } from "../../services/onboarding";
import { useLocaleStore } from "../../store/localeStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import { colors } from "../../theme/colors";

function initialCreationMode(
  bootstrap: ReturnType<typeof useOnboardingStore.getState>["bootstrap"],
): ProfileCreationMode | null {
  const mode = bootstrap?.profile?.creationMode ?? bootstrap?.creationMode ?? null;
  return mode === "self" || mode === "on_behalf" ? mode : null;
}

function initialRelation(
  bootstrap: ReturnType<typeof useOnboardingStore.getState>["bootstrap"],
): OnBehalfRelation | "" {
  const relation = bootstrap?.onBehalfRelation ?? bootstrap?.profile?.onBehalfRelation;
  if (relation && ON_BEHALF_RELATIONS.includes(relation as OnBehalfRelation)) {
    return relation as OnBehalfRelation;
  }
  return "";
}

export default function ProfileCreationIntentScreen() {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tOnboardingCreationIntent(locale);
  const bootstrap = useOnboardingStore((s) => s.bootstrap);
  const refresh = useOnboardingStore((s) => s.refresh);

  const [mode, setMode] = useState<ProfileCreationMode | null>(() =>
    initialCreationMode(bootstrap),
  );
  const [relation, setRelation] = useState<OnBehalfRelation | "">(() =>
    initialRelation(bootstrap),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!mode) return;
    if (mode === "on_behalf" && !relation) {
      setError(copy.relationRequired);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const profile = await setCreationIntent({
        creationMode: mode,
        onBehalfRelation:
          mode === "on_behalf" ? (relation as OnBehalfRelation) : undefined,
      });

      const currentBootstrap = useOnboardingStore.getState().bootstrap;
      if (currentBootstrap) {
        const nextBootstrap = {
          ...currentBootstrap,
          creationMode: mode,
          onBehalfRelation:
            mode === "on_behalf" ? (relation as OnBehalfRelation) : null,
          profile,
          completionPercent: profile.completionPercent ?? currentBootstrap.completionPercent,
          completionMissing: profile.completionMissing ?? currentBootstrap.completionMissing,
        };
        useOnboardingStore.setState({
          bootstrap: nextBootstrap,
          phase: computeOnboardingPhase(nextBootstrap),
        });
      }

      await refresh(locale, { force: true });
    } catch (err) {
      const message = getApiErrorMessage(err, copy.saveFailed);
      if (message.toLowerCase().includes("already set")) {
        await refresh(locale, { force: true });
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        <View style={styles.modeGrid}>
          {PROFILE_CREATION_MODES.map((value) => {
            const active = mode === value;
            const title = value === "self" ? copy.selfTitle : copy.onBehalfTitle;
            const description =
              value === "self" ? copy.selfDescription : copy.onBehalfDescription;
            return (
              <Pressable
                key={value}
                style={[styles.modeCard, active && styles.modeCardActive]}
                onPress={() => {
                  setMode(value);
                  if (value === "self") setRelation("");
                  setError(null);
                }}
              >
                <Text style={styles.modeTitle}>{title}</Text>
                <Text style={styles.modeDescription}>{description}</Text>
              </Pressable>
            );
          })}
        </View>

        {mode === "on_behalf" ? (
          <View style={styles.relationBlock}>
            <Text style={styles.relationLabel}>{copy.relationLabel}</Text>
            {ON_BEHALF_RELATIONS.map((value) => {
              const active = relation === value;
              return (
                <Pressable
                  key={value}
                  style={[styles.relationOption, active && styles.relationOptionActive]}
                  onPress={() => setRelation(value)}
                >
                  <Text style={[styles.relationText, active && styles.relationTextActive]}>
                    {copy.relations[value]}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.hint}>{copy.onBehalfNidHint}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, (!mode || busy) && styles.buttonDisabled]}
          disabled={!mode || busy}
          onPress={() => void handleContinue()}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>{copy.continue}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", color: colors.zinc900, textAlign: "center" },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc600,
    textAlign: "center",
  },
  modeGrid: { marginTop: 24, gap: 12 },
  modeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    padding: 16,
  },
  modeCardActive: {
    borderColor: colors.rose800,
    backgroundColor: "#fff1f2",
  },
  modeTitle: { fontSize: 17, fontWeight: "700", color: colors.zinc900 },
  modeDescription: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.zinc600 },
  relationBlock: { marginTop: 20, gap: 8 },
  relationLabel: { fontSize: 14, fontWeight: "700", color: colors.zinc800 },
  relationOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  relationOptionActive: {
    borderColor: colors.rose800,
    backgroundColor: colors.rose800,
  },
  relationText: { fontSize: 14, fontWeight: "600", color: colors.rose800 },
  relationTextActive: { color: colors.white },
  hint: { marginTop: 8, fontSize: 13, lineHeight: 18, color: "#92400e" },
  primaryButton: {
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  error: { marginTop: 12, color: colors.red600, fontSize: 13 },
});
