import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_LOCK_SETUP_SEEN_KEY } from "../constants/storage-keys";

function seenKey(userId: string) {
  return `${APP_LOCK_SETUP_SEEN_KEY}:${userId}`;
}

export async function hasSeenPinSetupPrompt(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(seenKey(userId))) === "1";
}

export async function markPinSetupPromptSeen(userId: string): Promise<void> {
  await AsyncStorage.setItem(seenKey(userId), "1");
}
