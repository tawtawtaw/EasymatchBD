import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { tNavigation } from "../i18n/messages";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

function StateShell({
  icon,
  iconColor,
  iconBackground,
  title,
  message,
  children,
}: {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  title?: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <View style={[styles.iconBadge, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons name={icon} size={32} color={iconColor} />
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.rose800} />
      <Text style={styles.message}>{label ?? nav.app.loadingDefault}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
  retryLabel,
  title,
  icon = "alert-circle-outline",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
  icon?: IconName;
}) {
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);

  return (
    <StateShell
      icon={icon}
      iconColor={colors.red600}
      iconBackground={colors.red50}
      title={title ?? nav.app.somethingWrong}
      message={message}
    >
      {onRetry ? (
        <ActionButton label={retryLabel ?? nav.app.tryAgain} onPress={onRetry} />
      ) : null}
    </StateShell>
  );
}

export function EmptyState({
  message,
  title,
  icon = "inbox-outline",
  actionLabel,
  onAction,
}: {
  message: string;
  title?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);

  return (
    <StateShell
      icon={icon}
      iconColor={colors.rose800}
      iconBackground={colors.rose100}
      title={title ?? nav.app.nothingHere}
      message={message}
    >
      {actionLabel && onAction ? (
        <ActionButton label={actionLabel} onPress={onAction} />
      ) : null}
    </StateShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.rose50,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.zinc900,
    textAlign: "center",
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc600,
    textAlign: "center",
    maxWidth: 280,
  },
  button: {
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
