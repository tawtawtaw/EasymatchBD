import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export type MainTabIconName = "home" | "discovery" | "connections" | "messages" | "account";

type TabAccent = {
  active: string;
  pill: string;
  iconFocused: keyof typeof MaterialCommunityIcons.glyphMap;
  iconDefault: keyof typeof MaterialCommunityIcons.glyphMap;
};

const TAB_ACCENTS: Record<MainTabIconName, TabAccent> = {
  home: {
    active: colors.tabHome,
    pill: colors.tabHomePill,
    iconFocused: "home-heart",
    iconDefault: "home-outline",
  },
  discovery: {
    active: colors.tabDiscovery,
    pill: colors.tabDiscoveryPill,
    iconFocused: "compass",
    iconDefault: "compass-outline",
  },
  connections: {
    active: colors.tabConnections,
    pill: colors.tabConnectionsPill,
    iconFocused: "account-heart",
    iconDefault: "account-heart-outline",
  },
  messages: {
    active: colors.tabMessages,
    pill: colors.tabMessagesPill,
    iconFocused: "message-text",
    iconDefault: "message-text-outline",
  },
  account: {
    active: colors.tabAccount,
    pill: colors.tabAccountPill,
    iconFocused: "account-circle",
    iconDefault: "account-circle-outline",
  },
};

type Props = {
  name: MainTabIconName;
  focused: boolean;
  size?: number;
};

export function TabBarIcon({ name, focused, size = 22 }: Props) {
  const accent = TAB_ACCENTS[name];
  const iconName = focused ? accent.iconFocused : accent.iconDefault;

  // The pill is what carries the tab's colour. Tinting the glyph instead would
  // put a dark accent on the dark bar, which is how the labels used to read at
  // barely 1.2:1.
  return (
    <View style={[styles.wrap, focused && { backgroundColor: accent.pill }]}>
      <MaterialCommunityIcons
        name={iconName}
        size={size}
        color={focused ? accent.active : colors.rose200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
