import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { tNavigation } from "../i18n/messages";
import { confirmSignOut } from "../lib/confirm-sign-out";
import type { MainTabParamList } from "../navigation/types";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";

type AccountMenuButtonProps = {
  showMyProfile?: boolean;
  showSettings?: boolean;
};

export function AccountMenuButton({
  showMyProfile = true,
  showSettings = true,
}: AccountMenuButtonProps) {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const locale = useLocaleStore((s) => s.locale);
  const copy = tNavigation(locale).app;

  function openMenu() {
    const actions: Array<{
      text: string;
      onPress?: () => void;
      style?: "default" | "cancel" | "destructive";
    }> = [];

    if (showMyProfile) {
      actions.push({
        text: copy.myProfile,
        onPress: () => navigation.navigate("Profile", { screen: "ProfileHome" }),
      });
    }

    if (showSettings) {
      actions.push({
        text: copy.settings,
        onPress: () => navigation.navigate("Profile", { screen: "Settings" }),
      });
    }

    actions.push(
      {
        text: copy.signOut,
        style: "destructive",
        onPress: () => confirmSignOut(locale),
      },
      { text: copy.cancel, style: "cancel" },
    );

    Alert.alert(copy.accountMenu, undefined, actions);
  }

  return (
    <Pressable
      onPress={openMenu}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={copy.accountMenu}
    >
      <Text style={styles.buttonText}>{copy.accountMenu}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
