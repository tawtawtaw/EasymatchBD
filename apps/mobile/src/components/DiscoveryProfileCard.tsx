import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ageFromDateOfBirth } from "@easymatch/shared";
import {
  fillMessageTemplate,
  tDiscoveryList,
  tNavigation,
} from "../i18n/messages";
import { formatBiodataFieldValue } from "../lib/biodata-display";
import type { AppLocale } from "../lib/locale";
import { resolveMemberDisplayName } from "../lib/member-display";
import { useDropdowns } from "../lib/use-dropdowns";
import type { DiscoveryListItem } from "../types/discovery";
import type { DropdownMap } from "../types/dropdowns";
import { useLocaleStore } from "../store/localeStore";
import { GenderProfileAvatar } from "./GenderProfileAvatar";
import { colors } from "../theme/colors";
import { cardShadow } from "../theme/shadows";

type Props = {
  item: DiscoveryListItem;
  onPress: () => void;
  bookmarkedLabel?: string;
  locale?: AppLocale;
};

/** Matches the palette GenderProfileAvatar already uses. */
const GENDER_BORDER: Record<string, string> = {
  male: colors.sky200,
  female: colors.rose200,
};

function readValue(personal: Record<string, unknown>, key: string) {
  const value = personal[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function profileFacts(
  personal: Record<string, unknown>,
  age: number | null | undefined,
  dropdowns: DropdownMap,
  locale: AppLocale,
  copy: ReturnType<typeof tDiscoveryList>,
) {
  // The API derives age so it survives date_of_birth being privacy-gated, but
  // fall back for anything served by an older build.
  const dateOfBirth = readValue(personal, "date_of_birth");
  const resolvedAge =
    age ?? (dateOfBirth ? ageFromDateOfBirth(dateOfBirth) : null);

  const coded = (label: string, key: string) => {
    const value = readValue(personal, key);
    if (!value) return null;
    return {
      label,
      value: formatBiodataFieldValue(key, value, { locale, dropdowns, personal }),
    };
  };

  return [
    coded(copy.cardProfession, "occupation"),
    coded(copy.cardEducation, "highest_degree"),
    resolvedAge != null
      ? { label: copy.cardAge, value: String(resolvedAge) }
      : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);
}

export function DiscoveryProfileCard({
  item,
  onPress,
  bookmarkedLabel,
  locale: localeProp,
}: Props) {
  const storeLocale = useLocaleStore((s) => s.locale);
  const locale = localeProp ?? storeLocale;
  const copy = tDiscoveryList(locale);
  const nav = tNavigation(locale);
  const dropdowns = useDropdowns(locale);
  const name = resolveMemberDisplayName(
    { profileCode: item.profileCode },
    item.personal,
    {
      profileRef: (code) => fillMessageTemplate(nav.app.profileRef, { code }),
      member: nav.app.member,
    },
  );
  const gender = typeof item.personal.gender === "string" ? item.personal.gender : null;
  const facts = profileFacts(item.personal, item.age, dropdowns, locale, copy);
  const match =
    item.compatibility.totalCriteria > 0
      ? fillMessageTemplate(copy.matchSummary, {
          score: item.compatibility.score,
          matched: item.compatibility.matchedCount,
          total: item.compatibility.totalCriteria,
        })
      : null;
  const profileRef = fillMessageTemplate(copy.profileRef, {
    code: item.profileCode,
  });
  // Privacy hides the name at low levels, in which case the heading is already
  // the profile code and repeating it below just says the same thing twice.
  const showProfileCode = name !== profileRef;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderColor: (gender && GENDER_BORDER[gender]) || colors.zinc300 },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <GenderProfileAvatar gender={gender} size={52} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {item.media.isVerified ? (
            <Pill
              icon="check-decagram"
              label={copy.verified}
              color={colors.emerald600}
              background={colors.emerald50}
            />
          ) : null}
          {item.isBookmarked ? (
            <Pill
              icon="bookmark"
              label={bookmarkedLabel ?? copy.saved}
              color={colors.rose800}
              background={colors.rose50}
            />
          ) : null}
        </View>
        {showProfileCode ? <Text style={styles.meta}>{profileRef}</Text> : null}
        {match ? (
          <View style={styles.matchRow}>
            <Pill
              icon="heart-multiple"
              label={match}
              color={colors.amber700}
              background={colors.amber50}
            />
          </View>
        ) : null}
        {facts.length > 0 ? (
          <View style={styles.facts}>
            {facts.map((fact) => (
              <View key={fact.label} style={styles.factRow}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text style={styles.factValue} numberOfLines={1}>
                  {fact.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function Pill({
  icon,
  label,
  color,
  background,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <MaterialCommunityIcons name={icon} size={11} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 2,
    padding: 14,
    marginBottom: 10,
    ...cardShadow,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.zinc600,
  },
  matchRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  facts: {
    marginTop: 6,
    gap: 2,
  },
  factRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  factLabel: {
    width: 96,
    fontSize: 11,
    color: colors.zinc500,
  },
  factValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc800,
  },
});
