import AsyncStorage from "@react-native-async-storage/async-storage";

export const VERIFICATION_SUBMITTED_KEY_PREFIX = "easymatch_verification_submitted:";

function storageKey(profileId: string) {
  return `${VERIFICATION_SUBMITTED_KEY_PREFIX}${profileId}`;
}

export async function readVerificationSubmittedAck(
  profileId: string | null | undefined,
): Promise<boolean> {
  if (!profileId) return false;
  return (await AsyncStorage.getItem(storageKey(profileId))) === "1";
}

export async function markVerificationSubmittedAck(
  profileId: string | null | undefined,
): Promise<void> {
  if (!profileId) return;
  await AsyncStorage.setItem(storageKey(profileId), "1");
}

export async function clearVerificationSubmittedAck(
  profileId: string | null | undefined,
): Promise<void> {
  if (!profileId) return;
  await AsyncStorage.removeItem(storageKey(profileId));
}
