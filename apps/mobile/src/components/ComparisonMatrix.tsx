import { StyleSheet, Text, View } from "react-native";
import {
  isAllBangladeshDistrictsPreferenceText,
  isAnyReligionPreferenceText,
} from "@easymatch/shared";
import type { ComparisonDirectionResult, ComparisonRow } from "@easymatch/shared";
import {
  biodataCommonLabel,
  profileFieldLabel,
} from "../i18n/biodata-fields";
import { fillComparisonTemplate, type ComparisonCopy } from "../i18n/comparison";
import type { AppLocale } from "../lib/locale";
import {
  createFieldOptionResolver,
  formatBiodataFieldValue,
} from "../lib/biodata-display";
import {
  COMPARISON_ATTRIBUTE_FIELD,
  COMPARISON_PREFERENCE_FIELD,
} from "../lib/comparison-fields";
import type { DropdownMap } from "../types/dropdowns";
import { colors } from "../theme/colors";

type Props = {
  direction: ComparisonDirectionResult;
  mode: "viewerToOther" | "otherToViewer";
  dropdowns: DropdownMap;
  locale: AppLocale;
  copy: ComparisonCopy;
};

const STATUS_ORDER: Record<ComparisonRow["status"], number> = {
  match: 0,
  mismatch: 1,
  unknown: 2,
  not_set: 3,
  not_applicable: 4,
};

function statusStyle(status: ComparisonRow["status"]) {
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

export function ComparisonMatrix({
  direction,
  mode,
  dropdowns,
  locale,
  copy,
}: Props) {
  const resolveStaticOption = createFieldOptionResolver((relativeKey) =>
    profileFieldLabel(locale, relativeKey),
  );

  function formatDistrictCode(code: string) {
    return formatBiodataFieldValue("current_district", code.trim(), {
      locale,
      dropdowns,
      resolveStaticOption,
      yesLabel: biodataCommonLabel(locale, "yes"),
      noLabel: biodataCommonLabel(locale, "no"),
    });
  }

  function formatReligionCode(code: string) {
    return formatBiodataFieldValue("religion", code.trim(), {
      locale,
      dropdowns,
      resolveStaticOption,
      yesLabel: biodataCommonLabel(locale, "yes"),
      noLabel: biodataCommonLabel(locale, "no"),
    });
  }

  function formatCell(
    key: ComparisonRow["key"],
    value: string | null,
    side: "expectation" | "attribute",
  ) {
    if (!value) return "—";

    if (key === "district") {
      if (side === "expectation" && isAllBangladeshDistrictsPreferenceText(value)) {
        return profileFieldLabel(locale, "allDistrictsOfBangladesh");
      }
      if (value.includes(",")) {
        return value.split(",").map(formatDistrictCode).join(", ");
      }
      return formatDistrictCode(value);
    }

    if (key === "religion") {
      if (side === "expectation" && isAnyReligionPreferenceText(value)) {
        return profileFieldLabel(locale, "anyReligion");
      }
      return formatReligionCode(value);
    }

    if (key === "marital_status" || key === "profession") {
      if (value.includes(",")) {
        const fieldKey =
          side === "expectation"
            ? COMPARISON_PREFERENCE_FIELD[key]
            : COMPARISON_ATTRIBUTE_FIELD[key];
        return value
          .split(",")
          .map((part) =>
            formatBiodataFieldValue(fieldKey, part.trim(), {
              locale,
              dropdowns,
              resolveStaticOption,
              yesLabel: biodataCommonLabel(locale, "yes"),
              noLabel: biodataCommonLabel(locale, "no"),
            }),
          )
          .join(", ");
      }
    }

    const fieldKey =
      side === "expectation"
        ? COMPARISON_PREFERENCE_FIELD[key]
        : COMPARISON_ATTRIBUTE_FIELD[key];

    if (key === "age" && side === "attribute") {
      return value;
    }

    return formatBiodataFieldValue(fieldKey, value, {
      locale,
      dropdowns,
      resolveStaticOption,
      yesLabel: biodataCommonLabel(locale, "yes"),
      noLabel: biodataCommonLabel(locale, "no"),
    });
  }

  if (!direction.available) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{copy.otherPreferencesHidden}</Text>
      </View>
    );
  }

  if (direction.totalCriteria === 0) {
    return (
      <View style={styles.noticeMuted}>
        <Text style={styles.noticeMutedText}>{copy.noCriteria}</Text>
      </View>
    );
  }

  const directionTitle =
    mode === "viewerToOther" ? copy.viewerToOtherTitle : copy.otherToViewerTitle;
  const attributeLabel = mode === "otherToViewer" ? copy.yourValue : copy.theirValue;

  const visibleRows = direction.rows
    .filter((row) => row.status !== "not_applicable")
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <View style={styles.container}>
      <Text style={styles.directionTitle}>{directionTitle}</Text>
      <View style={styles.scoreBox}>
        <Text style={styles.scoreText}>
          {fillComparisonTemplate(copy.directionScore, {
            score: direction.score,
            matched: direction.matchedCount,
            total: direction.totalCriteria,
          })}
        </Text>
      </View>

      {visibleRows.map((row) => {
        const style = statusStyle(row.status);
        return (
          <View key={row.key} style={[styles.card, { borderColor: style.border }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.criterion}>{copy.criteria[row.key]}</Text>
              <View style={[styles.badge, { backgroundColor: style.badgeBg }]}>
                <Text style={[styles.badgeText, { color: style.badgeText }]}>
                  {copy.status[row.status]}
                </Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>{copy.expectation}</Text>
                <Text style={styles.valueText}>
                  {row.expectationHidden
                    ? copy.hidden
                    : formatCell(row.key, row.expectationValue, "expectation")}
                </Text>
              </View>
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>{attributeLabel}</Text>
                <Text style={styles.valueText}>
                  {row.attributeHidden
                    ? copy.hidden
                    : formatCell(row.key, row.attributeValue, "attribute")}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  directionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  scoreBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: "#fff1f2",
    padding: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.rose900,
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
    backgroundColor: colors.rose800,
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
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    padding: 14,
  },
  noticeText: {
    fontSize: 13,
    color: "#92400e",
  },
  noticeMuted: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.zinc100,
    padding: 14,
  },
  noticeMutedText: {
    fontSize: 13,
    color: colors.zinc600,
  },
});
