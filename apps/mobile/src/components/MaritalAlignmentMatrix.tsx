import { StyleSheet, Text, View } from "react-native";
import { formatExpectedKabinAmountRangeBdt, LIVING_ARRANGEMENTS_OTHER_MALE_VALUE } from "@easymatch/shared";
import type { MaritalAlignmentResult, MaritalAlignmentRow } from "@easymatch/shared";
import { fillComparisonTemplate, type ComparisonCopy } from "../i18n/comparison";
import type { AppLocale } from "../lib/locale";
import {
  createFieldOptionResolver,
  formatBiodataFieldValue,
} from "../lib/biodata-display";
import { profileFieldLabel } from "../i18n/biodata-fields";
import type { DropdownMap } from "../types/dropdowns";
import { colors } from "../theme/colors";

const MARITAL_ALIGNMENT_FIELD: Record<MaritalAlignmentRow["key"], string> = {
  expected_marriage_timeline: "expectedMarriageTimeline",
  expected_parenthood_timeline: "expectedParenthoodTimeline",
  wedding_ceremony_preference: "weddingCeremonyPreference",
  expected_kabin_amount: "expectedKabinAmountMinBdt",
  living_arrangements: "livingArrangements",
};

type Props = {
  alignment: MaritalAlignmentResult;
  dropdowns: DropdownMap;
  locale: AppLocale;
  copy: ComparisonCopy;
  otherName: string;
};

const STATUS_ORDER: Record<MaritalAlignmentRow["status"], number> = {
  match: 0,
  mismatch: 1,
  unknown: 2,
  not_set: 3,
  not_applicable: 4,
};

function statusStyle(status: MaritalAlignmentRow["status"]) {
  switch (status) {
    case "match":
      return { border: colors.emerald600, badgeBg: "#ecfdf5", badgeText: colors.emerald600 };
    case "mismatch":
      return { border: colors.red600, badgeBg: "#fef2f2", badgeText: colors.red600 };
    case "not_set":
      return { border: "#d97706", badgeBg: "#fffbeb", badgeText: "#b45309" };
    default:
      return { border: colors.zinc100, badgeBg: colors.zinc100, badgeText: colors.zinc600 };
  }
}

export function MaritalAlignmentMatrix({
  alignment,
  dropdowns,
  locale,
  copy,
  otherName,
}: Props) {
  const resolveStaticOption = createFieldOptionResolver((relativeKey) =>
    profileFieldLabel(locale, relativeKey),
  );

  function formatValue(row: MaritalAlignmentRow, side: "viewer" | "other") {
    if (side === "viewer" ? row.viewerHidden : row.otherHidden) {
      return copy.hidden;
    }

    if (row.key === "expected_kabin_amount") {
      return (
        formatExpectedKabinAmountRangeBdt(
          side === "viewer" ? row.viewerKabinMin : row.otherKabinMin,
          side === "viewer" ? row.viewerKabinMax : row.otherKabinMax,
          locale,
        ) ?? "—"
      );
    }

    const raw = side === "viewer" ? row.viewerValue : row.otherValue;
    if (!raw) return "—";

    const gender =
      side === "viewer" ? alignment.viewerGender : alignment.otherGender;
    const livingOther =
      side === "viewer" ? row.viewerLivingOther : row.otherLivingOther;

    const label = formatBiodataFieldValue(MARITAL_ALIGNMENT_FIELD[row.key], raw, {
      locale,
      dropdowns,
      personal: { gender },
      resolveStaticOption,
    });

    if (
      row.key === "living_arrangements" &&
      raw === LIVING_ARRANGEMENTS_OTHER_MALE_VALUE &&
      livingOther
    ) {
      return `${label} (${livingOther})`;
    }

    return label;
  }

  if (alignment.totalCriteria === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.maritalAlignmentTitle}</Text>
        <Text style={styles.noticeMutedText}>{copy.maritalAlignmentNoCriteria}</Text>
      </View>
    );
  }

  const visibleRows = alignment.rows
    .filter((row) => row.status !== "not_applicable")
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{copy.maritalAlignmentTitle}</Text>
      <Text style={styles.subtitle}>
        {fillComparisonTemplate(copy.maritalAlignmentSubtitle, { other: otherName })}
      </Text>
      <View style={styles.scoreBox}>
        <Text style={styles.scoreText}>
          {fillComparisonTemplate(copy.maritalAlignmentScore, {
            score: alignment.score,
            matched: alignment.matchedCount,
            total: alignment.totalCriteria,
          })}
        </Text>
      </View>

      {visibleRows.map((row) => {
        const style = statusStyle(row.status);
        return (
          <View key={row.key} style={[styles.card, { borderColor: style.border }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.criterion}>{copy.maritalCriteria[row.key]}</Text>
              <View style={[styles.badge, { backgroundColor: style.badgeBg }]}>
                <Text style={[styles.badgeText, { color: style.badgeText }]}>
                  {copy.status[row.status]}
                </Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>{copy.yourValue}</Text>
                <Text style={styles.valueText}>{formatValue(row, "viewer")}</Text>
              </View>
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>{copy.theirValue}</Text>
                <Text style={styles.valueText}>{formatValue(row, "other")}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  subtitle: {
    fontSize: 13,
    color: colors.zinc600,
    lineHeight: 18,
  },
  scoreBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#f5f3ff",
    padding: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5b21b6",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#6d28d9",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  criterion: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
    textTransform: "uppercase",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardBody: {
    padding: 12,
    gap: 10,
  },
  valueRow: {
    gap: 4,
  },
  valueLabel: {
    fontSize: 12,
    color: colors.zinc500,
    fontWeight: "600",
  },
  valueText: {
    fontSize: 14,
    color: colors.zinc900,
    fontWeight: "600",
  },
  noticeMutedText: {
    fontSize: 13,
    color: colors.zinc600,
  },
});
