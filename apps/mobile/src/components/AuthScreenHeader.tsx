import { StyleSheet, Text, View } from "react-native";
import { AppLogo } from "./AppLogo";
import { colors } from "../theme/colors";

type AuthScreenHeaderProps = {
  brand: string;
  subtitle?: string;
  logoSize?: number;
};

export function AuthScreenHeader({
  brand,
  subtitle,
  logoSize = 88,
}: AuthScreenHeaderProps) {
  return (
    <View style={styles.hero}>
      <AppLogo size={logoSize} style={styles.logo} />
      <Text style={styles.brand}>{brand}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    marginBottom: 12,
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.rose900,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.zinc600,
    textAlign: "center",
  },
});
