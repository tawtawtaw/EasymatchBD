import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ComparisonMatrix } from "../../components/ComparisonMatrix";
import { MaritalAlignmentMatrix } from "../../components/MaritalAlignmentMatrix";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { fillComparisonTemplate, tComparison, type ComparisonCopy } from "../../i18n/comparison";
import { getApiErrorMessage } from "../../lib/api-error";
import { resolveMemberDisplayName } from "../../lib/member-display";
import type { ProfileCompareScreenProps } from "../../navigation/types";
import { getProfileComparison } from "../../services/comparison";
import { getDropdowns } from "../../services/dropdowns";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

export default function ProfileCompareScreen({
  route,
  navigation,
}: ProfileCompareScreenProps) {
  const { profileId, profileCode } = route.params;
  const locale = useLocaleStore((s) => s.locale);
  const copy = tComparison(locale);
  const [comparison, setComparison] = useState<Awaited<
    ReturnType<typeof getProfileComparison>
  > | null>(null);
  const [dropdowns, setDropdowns] = useState<Awaited<ReturnType<typeof getDropdowns>>>(
    {},
  );
  const [tab, setTab] = useState<"viewerToOther" | "otherToViewer">("viewerToOther");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dd, data] = await Promise.all([
        getDropdowns(locale),
        getProfileComparison(profileId),
      ]);
      setDropdowns(dd);
      setComparison(data);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, locale, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingState label={copy.title} />;
  }

  if (error && !comparison) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  if (!comparison) {
    return <ErrorState message={copy.loadError} onRetry={() => void load()} />;
  }

  const viewerName = comparison.viewer?.fullName ?? copy.you;
  const otherName = resolveMemberDisplayName(
    {
      profileCode: comparison.other?.profileCode ?? null,
      fullName: comparison.other?.fullName ?? null,
    },
    undefined,
    {
      profileRef: (code) => fillComparisonTemplate(copy.profileRef, { code }),
      member: copy.member,
    },
  );

  const direction =
    tab === "viewerToOther" ? comparison.viewerToOther : comparison.otherToViewer;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>
        {fillComparisonTemplate(copy.subtitle, { you: viewerName, other: otherName })}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.scoreGrid}>
        <ScoreCard
          label={copy.mutualScore}
          value={`${comparison.mutualScore}%`}
          tone="rose"
        />
        <ScoreCard
          label={copy.youExpectFromThem}
          value={`${comparison.viewerToOther.score}%`}
          tone="emerald"
        />
        <ScoreCard
          label={copy.theyExpectFromYou}
          value={
            comparison.otherPreferencesVisible
              ? `${comparison.otherToViewer.score}%`
              : copy.hiddenShort
          }
          tone="sky"
        />
      </View>

      {!comparison.otherPreferencesVisible ? (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>{copy.otherPreferencesHiddenHint}</Text>
        </View>
      ) : null}

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, tab === "viewerToOther" && styles.tabActive]}
          onPress={() => setTab("viewerToOther")}
        >
          <Text style={[styles.tabText, tab === "viewerToOther" && styles.tabTextActive]}>
            {fillComparisonTemplate(copy.tabViewerToOther, { other: otherName })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "otherToViewer" && styles.tabActive]}
          onPress={() => setTab("otherToViewer")}
        >
          <Text style={[styles.tabText, tab === "otherToViewer" && styles.tabTextActive]}>
            {fillComparisonTemplate(copy.tabOtherToViewer, { other: otherName })}
          </Text>
        </Pressable>
      </View>

      <ComparisonMatrix
        direction={direction}
        mode={tab}
        dropdowns={dropdowns}
        locale={locale}
        copy={copy}
      />

      <MaritalAlignmentMatrix
        alignment={comparison.maritalAlignment}
        dropdowns={dropdowns}
        locale={locale}
        copy={copy}
        otherName={otherName}
      />
    </ScrollView>
  );
}

function ScoreCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "rose" | "emerald" | "sky";
}) {
  const toneStyles = {
    rose: { border: colors.rose100, header: colors.rose800, value: colors.rose900 },
    emerald: { border: "#a7f3d0", header: colors.emerald600, value: colors.emerald600 },
    sky: { border: "#bae6fd", header: "#0369a1", value: "#0c4a6e" },
  }[tone];

  return (
    <View style={[styles.scoreCard, { borderColor: toneStyles.border }]}>
      <Text style={[styles.scoreCardLabel, { color: toneStyles.header }]}>{label}</Text>
      <Text style={[styles.scoreCardValue, { color: toneStyles.value }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  backLink: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.rose800,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.zinc900,
  },
  subtitle: {
    fontSize: 14,
    color: colors.zinc600,
    lineHeight: 20,
  },
  error: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
  scoreGrid: {
    gap: 10,
  },
  scoreCard: {
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: colors.white,
    padding: 14,
  },
  scoreCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  scoreCardValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: "800",
  },
  hintBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    padding: 12,
  },
  hintText: {
    fontSize: 13,
    color: "#92400e",
  },
  tabRow: {
    gap: 8,
  },
  tab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.zinc100,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  tabActive: {
    backgroundColor: colors.rose800,
    borderColor: colors.rose800,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc800,
    textAlign: "center",
  },
  tabTextActive: {
    color: colors.white,
  },
});
