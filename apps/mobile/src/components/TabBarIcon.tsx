import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export type MainTabIconName = "home" | "discovery" | "connections" | "messages" | "account";

type TabAccent = {
  active: string;
  iconFocused: keyof typeof MaterialCommunityIcons.glyphMap;
  iconDefault: keyof typeof MaterialCommunityIcons.glyphMap;
};

const TAB_ACCENTS: Record<MainTabIconName, TabAccent> = {
  home: {
    active: colors.tabHome,
    iconFocused: "home-heart",
    iconDefault: "home-outline",
  },
  discovery: {
    active: colors.tabDiscovery,
    iconFocused: "compass",
    iconDefault: "compass-outline",
  },
  connections: {
    active: colors.tabConnections,
    iconFocused: "account-heart",
    iconDefault: "account-heart-outline",
  },
  messages: {
    active: colors.tabMessages,
    iconFocused: "message-text",
    iconDefault: "message-text-outline",
  },
  account: {
    active: colors.tabAccount,
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
  const iconColor = focused ? colors.white : colors.rose200;

  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <MaterialCommunityIcons name={iconName} size={size} color={iconColor} />
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
  wrapFocused: {
    backgroundColor: colors.rose800,
  },
});
