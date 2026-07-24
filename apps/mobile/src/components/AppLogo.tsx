import { Image, StyleSheet, type ImageStyle, type StyleProp } from "react-native";

const logoSource = require("../../assets/logo.png");

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function AppLogo({ size = 88, style }: AppLogoProps) {
  return (
    <Image
      source={logoSource}
      style={[styles.logo, { width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="EasymatchBD"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    borderRadius: 20,
  },
});
