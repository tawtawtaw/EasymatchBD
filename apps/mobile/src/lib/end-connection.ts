import { Alert } from "react-native";
import type { tEndConnection } from "../i18n/messages";

type EndConnectionCopy = ReturnType<typeof tEndConnection>;

export function confirmEndConnection(
  copy: EndConnectionCopy,
  privacyLevel: number,
  onConfirm: () => void,
) {
  const message =
    privacyLevel >= 3 ? `${copy.body}\n\n${copy.familyNote}` : copy.body;
  Alert.alert(copy.title, message, [
    { text: copy.keep, style: "cancel" },
    { text: copy.confirm, style: "destructive", onPress: onConfirm },
  ]);
}
