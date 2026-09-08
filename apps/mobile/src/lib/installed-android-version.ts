import Constants from "expo-constants";
import { Platform } from "react-native";

export function installedAndroidVersionCode(): number {
  if (Platform.OS !== "android") return 0;
  const fromConfig = Constants.expoConfig?.android?.versionCode;
  if (typeof fromConfig === "number" && fromConfig > 0) return fromConfig;
  const native = Number(Constants.nativeBuildVersion);
  if (Number.isInteger(native) && native > 0) return native;
  return 0;
}
