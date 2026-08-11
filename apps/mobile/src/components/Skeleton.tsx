import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { cardShadow } from "../theme/shadows";

/**
 * Placeholders are shaped like the real content so the layout does not jump
 * when data lands. A single opacity pulse is cheap enough to run on the native
 * driver, unlike a translating shimmer gradient.
 */
export function SkeletonBlock({
  width,
  height,
  radius = 8,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, opacity: pulse },
        styles.block,
        style,
      ]}
    />
  );
}

export function ProfileCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBlock width={52} height={52} radius={11} />
      <View style={styles.body}>
        <SkeletonBlock width="60%" height={15} />
        <SkeletonBlock width="40%" height={11} style={styles.line} />
        <SkeletonBlock width="75%" height={11} style={styles.line} />
      </View>
    </View>
  );
}

export function ProfileListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <ProfileCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.rose100,
  },
  list: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.rose50,
  },
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
  body: {
    flex: 1,
    minWidth: 0,
  },
  line: {
    marginTop: 8,
  },
});
