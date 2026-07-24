import { Alert, Linking, Platform } from "react-native";

export function promptOpenAppSettings(
  title: string,
  message: string,
  openLabel: string,
): void {
  if (Platform.OS === "web") return;
  Alert.alert(title, message, [
    { text: openLabel, onPress: () => void Linking.openSettings() },
    { text: "Cancel", style: "cancel" },
  ]);
}
