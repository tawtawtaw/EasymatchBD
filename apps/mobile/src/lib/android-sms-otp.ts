import { Platform } from "react-native";
import { extractOtpFromSms } from "./extract-otp";

type SmsConsentModule = {
  startSmsUserConsent: (sender?: string) => Promise<unknown>;
  addSmsListener: (callback: (event: { message: string }) => void) => {
    remove: () => void;
  };
  removeSmsListener: () => void;
};

let otpListener: ((otp: string) => void) | null = null;
let lastOtp: string | null = null;
let subscription: { remove: () => void } | null = null;
let started = false;

function loadModule(): SmsConsentModule | null {
  if (Platform.OS !== "android") {
    return null;
  }
  try {
    // Native module is missing in Expo Go until a new APK includes it.
    return require("expo-otp-autofill-consent") as SmsConsentModule;
  } catch {
    return null;
  }
}

function onMessage(message: string) {
  const otp = extractOtpFromSms(message);
  if (!otp) {
    return;
  }
  lastOtp = otp;
  otpListener?.(otp);
}

export async function startAndroidSmsOtpCapture(): Promise<void> {
  const sms = loadModule();
  if (!sms) {
    return;
  }

  if (!subscription) {
    subscription = sms.addSmsListener((event) => {
      onMessage(event.message);
    });
  }

  try {
    await sms.startSmsUserConsent();
    started = true;
  } catch {
    started = false;
  }
}

export function subscribeAndroidSmsOtp(onOtp: (otp: string) => void): () => void {
  otpListener = onOtp;
  if (lastOtp) {
    onOtp(lastOtp);
    lastOtp = null;
  }

  return () => {
    if (otpListener === onOtp) {
      otpListener = null;
    }
  };
}

export function stopAndroidSmsOtpCapture(): void {
  const sms = loadModule();
  subscription?.remove();
  subscription = null;
  otpListener = null;
  lastOtp = null;
  started = false;
  try {
    sms?.removeSmsListener();
  } catch {
    /* native module may already be gone */
  }
}

export function isAndroidSmsOtpCaptureAvailable(): boolean {
  return loadModule() != null && started;
}
