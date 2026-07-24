import { Pressable, StyleSheet, Text, View } from "react-native";
import { APP_LOCALES, type AppLocale } from "../lib/locale";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";

type Props = {
  compact?: boolean;
};

const LABELS: Record<AppLocale, string> = {
  bn: "বাংলা",
  en: "English",
};

export function LanguageToggle({ compact = false }: Props) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {APP_LOCALES.map((option) => {
        const active = locale === option;
        return (
          <Pressable
            key={option}
            style={[styles.button, compact && styles.buttonCompact, active && styles.buttonActive]}
            onPress={() => void setLocale(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.buttonText,
                compact && styles.buttonTextCompact,
                active && styles.buttonTextActive,
              ]}
            >
              {LABELS[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  rowCompact: {
    alignSelf: "flex-end",
  },
  button: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonActive: {
    backgroundColor: colors.rose800,
    borderColor: colors.rose800,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc700,
  },
  buttonTextCompact: {
    fontSize: 12,
  },
  buttonTextActive: {
    color: colors.white,
  },
});
