import { StyleSheet, Text, View } from "react-native";
import { AppLogo } from "./AppLogo";
import { colors } from "../theme/colors";

type AuthScreenHeaderProps = {
  brand?: string;
  subtitle?: string;
  logoWidth?: number;
  /** @deprecated Use logoWidth. */
  logoSize?: number;
};

export function AuthScreenHeader({
  subtitle,
  logoWidth,
  logoSize = 240,
}: AuthScreenHeaderProps) {
  return (
    <View style={styles.hero}>
      <AppLogo width={logoWidth ?? logoSize} style={styles.logo} />
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
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    color: colors.zinc600,
    textAlign: "center",
  },
});
