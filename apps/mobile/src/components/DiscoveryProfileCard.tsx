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
    <Pressable style={styles.card} onPress={onPress}>
      <GenderProfileAvatar gender={gender} size={52} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {item.media.isVerified ? (
            <Text style={styles.verified}>{copy.verified}</Text>
          ) : null}
          {item.isBookmarked ? (
            <Text style={styles.bookmarked}>{bookmarkedLabel ?? copy.saved}</Text>
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

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 14,
    marginBottom: 10,
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
  verified: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.emerald600,
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  bookmarked: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.rose800,
    backgroundColor: colors.rose50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
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
