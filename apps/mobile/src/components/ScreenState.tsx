import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { tNavigation } from "../i18n/messages";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";

export function LoadingState({ label }: { label?: string }) {
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.rose800} />
      <Text style={styles.muted}>{label ?? nav.app.loadingDefault}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);

  return (
    <View style={styles.center}>
      <Text style={styles.error}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>{retryLabel ?? nav.app.tryAgain}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.muted}>{message}</Text>
    </View>
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
  muted: {
    marginTop: 12,
    fontSize: 14,
    color: colors.zinc600,
    textAlign: "center",
  },
  error: {
    fontSize: 14,
    color: colors.red600,
    textAlign: "center",
  },
  button: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
  },
});
