import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { MemberProfileAvatar } from "./MemberProfileAvatar";
import { tAppLock } from "../i18n/app-lock";
import { tNavigation } from "../i18n/messages";
import { confirmSignOut } from "../lib/confirm-sign-out";
import type { MainTabParamList } from "../navigation/types";
import { useAppLockStore } from "../store/appLockStore";
import { useLocaleStore } from "../store/localeStore";
import { useMemberProfileStore } from "../store/memberProfileStore";
import { colors } from "../theme/colors";

const AVATAR_SIZE = 30;

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
  const lockCopy = tAppLock(locale);
  const lockEnabled = useAppLockStore((s) => s.enabled);
  const lockNow = useAppLockStore((s) => s.lockNow);
  const summary = useMemberProfileStore((s) => s.summary);
  const ensureLoaded = useMemberProfileStore((s) => s.ensureLoaded);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

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

    if (lockEnabled) {
      actions.push({ text: lockCopy.lockAppAction, onPress: () => lockNow() });
    }

    actions.push(
      {
        text: lockCopy.signOutTitle,
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
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      accessibilityRole="button"
      accessibilityLabel={copy.accountMenu}
      hitSlop={8}
    >
      <View style={styles.ring}>
        <MemberProfileAvatar
          photoId={summary?.primaryPhotoId}
          name={summary?.fullName}
          gender={summary?.gender}
          size={AVATAR_SIZE}
        />
      </View>
      {/* A photo on its own reads as decoration; the caret is what tells people
          the account actions still live here. */}
      <MaterialCommunityIcons name="chevron-down" size={18} color={colors.rose200} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    marginRight: 10,
    padding: 4,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  ring: {
    borderRadius: Math.round(AVATAR_SIZE * 0.2) + 2,
    borderWidth: 1.5,
    borderColor: colors.rose200,
    padding: 1.5,
    overflow: "hidden",
  },
});
