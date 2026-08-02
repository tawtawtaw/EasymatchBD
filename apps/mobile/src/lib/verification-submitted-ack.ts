import AsyncStorage from "@react-native-async-storage/async-storage";

export const VERIFICATION_SUBMITTED_KEY = "easymatch_verification_submitted";

export async function readVerificationSubmittedAck(): Promise<boolean> {
  return (await AsyncStorage.getItem(VERIFICATION_SUBMITTED_KEY)) === "1";
}

export async function markVerificationSubmittedAck(): Promise<void> {
  await AsyncStorage.setItem(VERIFICATION_SUBMITTED_KEY, "1");
}

export async function clearVerificationSubmittedAck(): Promise<void> {
  await AsyncStorage.removeItem(VERIFICATION_SUBMITTED_KEY);
}
