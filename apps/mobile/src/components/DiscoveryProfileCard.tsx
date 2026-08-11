import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  fillMessageTemplate,
  formatRelationshipStatus,
  tDiscoveryList,
  tNavigation,
} from "../i18n/messages";
import type { AppLocale } from "../lib/locale";
import { resolveMemberDisplayName } from "../lib/member-display";
import type { DiscoveryListItem } from "../types/discovery";
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
  const name = resolveMemberDisplayName(
    { profileCode: item.profileCode },
    item.personal,
    {
      profileRef: (code) => fillMessageTemplate(nav.app.profileRef, { code }),
      member: nav.app.member,
    },
  );
  const gender = typeof item.personal.gender === "string" ? item.personal.gender : null;
  const relationshipLabel = formatRelationshipStatus(locale, item.relationshipStatus);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
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
        <Text style={styles.meta}>
          {fillMessageTemplate(copy.profileRef, { code: item.profileCode })}
        </Text>
        {item.compatibility.totalCriteria > 0 ? (
          <Text style={styles.compat}>
            {fillMessageTemplate(copy.matchSummary, {
              score: item.compatibility.score,
              matched: item.compatibility.matchedCount,
              total: item.compatibility.totalCriteria,
            })}
          </Text>
        ) : null}
        <Text style={styles.privacy}>
          {fillMessageTemplate(copy.privacyLevelShort, {
            level: item.viewerPrivacyLevel,
          })}
        </Text>
        {relationshipLabel ? (
          <Text style={styles.status}>{relationshipLabel}</Text>
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
    borderWidth: 1,
    borderColor: colors.rose100,
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
  compat: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: colors.rose800,
  },
  privacy: {
    marginTop: 4,
    fontSize: 11,
    color: colors.zinc500,
  },
  status: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: colors.zinc700,
  },
});
