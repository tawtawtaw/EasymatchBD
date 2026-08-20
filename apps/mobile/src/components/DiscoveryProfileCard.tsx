import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ageFromDateOfBirth } from "@easymatch/shared";
import {
  fillMessageTemplate,
  tDiscoveryList,
  tNavigation,
} from "../i18n/messages";
import { formatBiodataFieldValue } from "../lib/biodata-display";
import { getApiErrorMessage } from "../lib/api-error";
import type { AppLocale } from "../lib/locale";
import { resolveMemberDisplayName } from "../lib/member-display";
import { sendDiscoveryInterest } from "../services/discovery";
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
  isPaid?: boolean;
  onLeave?: (profileId: string, reason: "pass" | "interest") => void;
  onActionError?: (message: string) => void;
};

/** Matches the palette GenderProfileAvatar already uses. */
const GENDER_BORDER: Record<string, string> = {
  male: colors.sky200,
  female: colors.rose200,
};

const SWIPE_COMMIT_PX = 80;
const SWIPE_COMMIT_VX = 0.75;
const SLIDE_OUT_MS = 220;
const SCREEN_W = Dimensions.get("window").width;

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
  isPaid = false,
  onLeave,
  onActionError,
}: Props) {
  const storeLocale = useLocaleStore((s) => s.locale);
  const locale = localeProp ?? storeLocale;
  const copy = tDiscoveryList(locale);
  const nav = tNavigation(locale);
  const dropdowns = useDropdowns(locale);
  const [busy, setBusy] = useState(false);
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
  const showQueueActions = Boolean(onLeave) && item.relationshipStatus === "none";

  const translateX = useRef(new Animated.Value(0)).current;
  const reduceMotionRef = useRef(false);
  const exitingRef = useRef(false);
  const suppressPressRef = useRef(false);
  const busyRef = useRef(false);
  const enabledRef = useRef(showQueueActions);
  const isPaidRef = useRef(isPaid);
  const copyRef = useRef(copy);
  const onLeaveRef = useRef(onLeave);
  const onActionErrorRef = useRef(onActionError);
  const onSwipeReleaseRef = useRef<(dx: number, vx: number) => void>(() => {});

  busyRef.current = busy;
  enabledRef.current = showQueueActions;
  isPaidRef.current = isPaid;
  copyRef.current = copy;
  onLeaveRef.current = onLeave;
  onActionErrorRef.current = onActionError;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!cancelled) reduceMotionRef.current = value;
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      reduceMotionRef.current = value;
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  function springBack() {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }

  function slideOut(direction: "pass" | "interest") {
    if (reduceMotionRef.current) {
      translateX.setValue(0);
      return Promise.resolve();
    }
    const toValue = direction === "pass" ? -SCREEN_W : SCREEN_W;
    return new Promise<void>((resolve) => {
      Animated.timing(translateX, {
        toValue,
        duration: SLIDE_OUT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => resolve());
    });
  }

  async function handlePass() {
    if (!onLeaveRef.current || busyRef.current || exitingRef.current) return;
    exitingRef.current = true;
    setBusy(true);
    await slideOut("pass");
    onLeaveRef.current(item.profileId, "pass");
  }

  async function handleInterest() {
    if (!onLeaveRef.current || busyRef.current || exitingRef.current) return;
    if (!isPaidRef.current) {
      springBack();
      onActionErrorRef.current?.(copyRef.current.swipePaidOnly);
      return;
    }
    setBusy(true);
    try {
      await sendDiscoveryInterest(item.profileId);
      exitingRef.current = true;
      await slideOut("interest");
      onLeaveRef.current(item.profileId, "interest");
    } catch (err) {
      springBack();
      onActionErrorRef.current?.(
        getApiErrorMessage(err, copyRef.current.sendInterestError),
      );
      setBusy(false);
    }
  }

  onSwipeReleaseRef.current = (dx, vx) => {
    const committed =
      Math.abs(dx) >= SWIPE_COMMIT_PX || Math.abs(vx) >= SWIPE_COMMIT_VX;
    if (dx < 0 && committed) {
      void handlePass();
      return;
    }
    if (dx > 0 && committed) {
      void handleInterest();
      return;
    }
    springBack();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        if (!enabledRef.current || busyRef.current || exitingRef.current) return false;
        return Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (!enabledRef.current || busyRef.current || exitingRef.current) return false;
        return Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
      },
      onPanResponderGrant: () => {
        suppressPressRef.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 8) suppressPressRef.current = true;
        const dx = !isPaidRef.current && g.dx > 0 ? g.dx * 0.28 : g.dx;
        translateX.setValue(dx);
      },
      onPanResponderRelease: (_, g) => {
        onSwipeReleaseRef.current(g.dx, g.vx);
      },
      onPanResponderTerminate: () => {
        if (!exitingRef.current) springBack();
      },
      onPanResponderTerminationRequest: () => !suppressPressRef.current,
    }),
  ).current;

  const fade = translateX.interpolate({
    inputRange: [-SCREEN_W, -48, 0, 48, SCREEN_W],
    outputRange: [0.35, 1, 1, 1, 0.35],
    extrapolate: "clamp",
  });
  const passStampOpacity = translateX.interpolate({
    inputRange: [-120, -36, 0],
    outputRange: [1, 0.45, 0],
    extrapolate: "clamp",
  });
  const interestStampOpacity = translateX.interpolate({
    inputRange: [0, 36, 120],
    outputRange: [0, 0.45, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.slot}>
      <Animated.View
        style={[
          styles.card,
          { borderColor: (gender && GENDER_BORDER[gender]) || colors.zinc300 },
          { transform: [{ translateX }], opacity: fade },
        ]}
        {...(showQueueActions ? panResponder.panHandlers : null)}
      >
        {showQueueActions ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.stamp, styles.passStamp, { opacity: passStampOpacity }]}
            >
              <Text style={styles.passStampText}>{copy.passProfile}</Text>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[styles.stamp, styles.interestStamp, { opacity: interestStampOpacity }]}
            >
              <Text style={styles.interestStampText}>{copy.sendInterest}</Text>
            </Animated.View>
          </>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.main, pressed && styles.cardPressed]}
          onPress={() => {
            if (suppressPressRef.current || exitingRef.current) return;
            onPress();
          }}
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
        {showQueueActions ? (
          <View style={styles.actions}>
            <Pressable
              disabled={busy}
              onPress={() => void handlePass()}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.passBtn,
                pressed && styles.actionPressed,
                busy && styles.actionDisabled,
              ]}
            >
              <Text style={styles.passText}>{copy.passProfile}</Text>
            </Pressable>
            {isPaid ? (
              <Pressable
                disabled={busy}
                onPress={() => void handleInterest()}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.interestBtn,
                  pressed && styles.actionPressed,
                  busy && styles.actionDisabled,
                ]}
              >
                <Text style={styles.interestText}>
                  {busy ? copy.sendingInterest : copy.sendInterest}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </View>
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
  slot: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 2,
    overflow: "hidden",
    ...cardShadow,
  },
  stamp: {
    position: "absolute",
    top: 14,
    zIndex: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  passStamp: {
    left: 14,
    borderColor: colors.zinc500,
  },
  passStampText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: colors.zinc700,
    textTransform: "uppercase",
  },
  interestStamp: {
    right: 14,
    borderColor: colors.rose800,
  },
  interestStampText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: colors.rose800,
    textTransform: "uppercase",
  },
  main: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  cardPressed: {
    opacity: 0.9,
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
  actions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 8,
  },
  passBtn: {
    borderWidth: 1,
    borderColor: colors.zinc300,
    backgroundColor: colors.white,
  },
  passText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc700,
  },
  interestBtn: {
    backgroundColor: colors.rose50,
    borderWidth: 1,
    borderColor: colors.rose200,
  },
  interestText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.rose800,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionDisabled: {
    opacity: 0.6,
  },
});
