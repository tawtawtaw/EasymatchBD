import { Image, StyleSheet, type ImageStyle, type StyleProp } from "react-native";

const logoSource = require("../../assets/logo.png");
const LOGO_ASPECT = 1280 / 853;

type AppLogoProps = {
  /** Width of the brand lockup. Height follows the artwork aspect ratio. */
  width?: number;
  /** @deprecated Use width. Kept so existing screens keep compiling. */
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function AppLogo({ width, size = 220, style }: AppLogoProps) {
  const logoWidth = width ?? size;
  return (
    <Image
      source={logoSource}
      style={[
        styles.logo,
        { width: logoWidth, height: logoWidth / LOGO_ASPECT },
        style,
      ]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="EasyMatchBD"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    backgroundColor: "transparent",
  },
});
