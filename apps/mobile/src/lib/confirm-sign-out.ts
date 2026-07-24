import { Alert } from "react-native";
import type { AppLocale } from "./locale";
import { tNavigation } from "../i18n/messages";
import { useAuthStore } from "../store/authStore";

export function confirmSignOut(locale: AppLocale) {
  const copy = tNavigation(locale).app;
  Alert.alert(copy.signOutConfirmTitle, copy.signOutConfirmBody, [
    { text: copy.cancel, style: "cancel" },
    {
      text: copy.signOut,
      style: "destructive",
      onPress: () => {
        void useAuthStore.getState().signOut();
      },
    },
  ]);
}
