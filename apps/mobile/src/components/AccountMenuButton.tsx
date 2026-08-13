import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MemberProfileAvatar } from "./MemberProfileAvatar";
import { tAppLock } from "../i18n/app-lock";
import { tNavigation } from "../i18n/messages";
import type { MainTabParamList } from "../navigation/types";
import { useAppLockStore } from "../store/appLockStore";
import { useLocaleStore } from "../store/localeStore";
import { useMemberProfileStore } from "../store/memberProfileStore";
import { colors } from "../theme/colors";
import { cardShadow } from "../theme/shadows";

const AVATAR_SIZE = 30;

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
};

/**
 * A sheet rather than Alert.alert, which caps at three buttons on Android and
 * was quietly dropping whichever action came last — Cancel on most screens.
 * Signing out lives in Settings only, so it takes a deliberate trip to reach.
 */
export function AccountMenuButton() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const insets = useSafeAreaInsets();
  const locale = useLocaleStore((s) => s.locale);
  const copy = tNavigation(locale).app;
  const lockCopy = tAppLock(locale);
  const lockEnabled = useAppLockStore((s) => s.enabled);
  const lockNow = useAppLockStore((s) => s.lockNow);
  const summary = useMemberProfileStore((s) => s.summary);
  const ensureLoaded = useMemberProfileStore((s) => s.ensureLoaded);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const items: MenuItem[] = [];

  if (lockEnabled) {
    items.push({
      key: "lock",
      label: lockCopy.lockAppAction,
      icon: "lock-outline",
      onPress: () => lockNow(),
    });
  }

  items.push(
    {
      key: "settings",
      label: copy.settings,
      icon: "cog-outline",
      onPress: () => navigation.navigate("Profile", { screen: "Settings" }),
    },
    {
      key: "myProfile",
      label: copy.myProfile,
      icon: "account-outline",
      onPress: () => navigation.navigate("Profile", { screen: "ProfileHome" }),
    },
  );

  function runItem(item: MenuItem) {
    setOpen(false);
    item.onPress();
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
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

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
            onPress={() => undefined}
          >
            <Text style={styles.sheetTitle}>{copy.accountMenu}</Text>

            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => runItem(item)}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={20}
                  color={colors.rose800}
                />
                <Text style={styles.itemText}>{item.label}</Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [styles.cancel, pressed && styles.itemPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{copy.cancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(24, 24, 27, 0.45)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 14,
    ...cardShadow,
  },
  sheetTitle: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: colors.zinc500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  itemPressed: {
    backgroundColor: colors.rose50,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.zinc900,
  },
  cancel: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.zinc300,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc700,
  },
});
