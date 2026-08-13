import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";
import {
  APP_LOCK_ATTEMPTS_KEY,
  APP_LOCK_BIOMETRIC_KEY,
  APP_LOCK_PIN_KEY,
} from "../constants/storage-keys";
import { deleteSecure, readSecure, writeSecure } from "../lib/secure-storage";

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/** Wrong guesses allowed before the keypad locks out. */
const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 15 * 60_000;

export type PinFormatError = "length" | "digits" | "weak";

export type PinVerifyResult =
  | { status: "ok" }
  | { status: "wrong"; remainingAttempts: number }
  | { status: "locked"; retryInMs: number }
  | { status: "unset" };

type AttemptState = { failures: number; lockedUntil: number };

const NO_ATTEMPTS: AttemptState = { failures: 0, lockedUntil: 0 };

/**
 * A 4-6 digit PIN has too little entropy for a work factor to matter, so the
 * real protection is the hardware keystore holding this record plus the
 * lockout below. The salt only stops a shared rainbow table across devices.
 */
async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}

function randomSalt(): string {
  return Array.from(Crypto.getRandomBytes(16))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;

  const ascending = pin
    .split("")
    .every((digit, index, all) =>
      index === 0 ? true : Number(digit) === Number(all[index - 1]) + 1,
    );
  const descending = pin
    .split("")
    .every((digit, index, all) =>
      index === 0 ? true : Number(digit) === Number(all[index - 1]) - 1,
    );

  return ascending || descending;
}

export function validatePinFormat(pin: string): PinFormatError | null {
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) return "length";
  if (!/^\d+$/.test(pin)) return "digits";
  if (isWeakPin(pin)) return "weak";
  return null;
}

export async function isPinSet(): Promise<boolean> {
  const record = await readSecure(APP_LOCK_PIN_KEY);
  return Boolean(record);
}

export async function setPin(pin: string): Promise<void> {
  const salt = randomSalt();
  const hash = await hashPin(pin, salt);
  await writeSecure(APP_LOCK_PIN_KEY, `${salt}:${hash}`);
  await resetAttempts();
}

export async function clearPin(): Promise<void> {
  await deleteSecure(APP_LOCK_PIN_KEY);
  await deleteSecure(APP_LOCK_ATTEMPTS_KEY);
  await AsyncStorage.removeItem(APP_LOCK_BIOMETRIC_KEY);
}

async function readAttempts(): Promise<AttemptState> {
  const raw = await readSecure(APP_LOCK_ATTEMPTS_KEY);
  if (!raw) return NO_ATTEMPTS;

  try {
    const parsed = JSON.parse(raw) as Partial<AttemptState>;
    return {
      failures: typeof parsed.failures === "number" ? parsed.failures : 0,
      lockedUntil: typeof parsed.lockedUntil === "number" ? parsed.lockedUntil : 0,
    };
  } catch {
    return NO_ATTEMPTS;
  }
}

async function writeAttempts(state: AttemptState): Promise<void> {
  await writeSecure(APP_LOCK_ATTEMPTS_KEY, JSON.stringify(state));
}

async function resetAttempts(): Promise<void> {
  await deleteSecure(APP_LOCK_ATTEMPTS_KEY);
}

function lockoutFor(failures: number): number {
  const overage = failures - MAX_ATTEMPTS;
  if (overage < 0) return 0;
  return Math.min(BASE_LOCKOUT_MS * 2 ** overage, MAX_LOCKOUT_MS);
}

/** Milliseconds until the keypad accepts input again, 0 when it already does. */
export async function getLockoutRemainingMs(): Promise<number> {
  const { lockedUntil } = await readAttempts();
  return Math.max(0, lockedUntil - Date.now());
}

export async function verifyPin(pin: string): Promise<PinVerifyResult> {
  const record = await readSecure(APP_LOCK_PIN_KEY);
  if (!record) return { status: "unset" };

  const attempts = await readAttempts();
  const retryInMs = Math.max(0, attempts.lockedUntil - Date.now());
  if (retryInMs > 0) return { status: "locked", retryInMs };

  const separator = record.indexOf(":");
  if (separator < 0) return { status: "unset" };

  const salt = record.slice(0, separator);
  const expected = record.slice(separator + 1);

  if ((await hashPin(pin, salt)) === expected) {
    await resetAttempts();
    return { status: "ok" };
  }

  const failures = attempts.failures + 1;
  const lockout = lockoutFor(failures);
  await writeAttempts({
    failures,
    lockedUntil: lockout > 0 ? Date.now() + lockout : 0,
  });

  if (lockout > 0) return { status: "locked", retryInMs: lockout };
  return { status: "wrong", remainingAttempts: MAX_ATTEMPTS - failures };
}

export type BiometricKind = "face" | "fingerprint" | "iris" | "generic" | "none";

export type BiometricCapability = {
  available: boolean;
  kind: BiometricKind;
};

export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hasHardware || !isEnrolled) return { available: false, kind: "none" };

    // On Android supportedAuthenticationTypesAsync reports hardware the device
    // *has*, not what the owner enrolled, so a phone with a selfie camera claims
    // face support even when only a fingerprint is registered. Naming a modality
    // from it promises the wrong gesture, so stay generic.
    if (Platform.OS === "android") {
      return { available: true, kind: "generic" };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return { available: true, kind: "face" };
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return { available: true, kind: "fingerprint" };
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return { available: true, kind: "iris" };
    }
    return { available: true, kind: "generic" };
  } catch {
    return { available: false, kind: "none" };
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(APP_LOCK_BIOMETRIC_KEY)) === "1";
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(APP_LOCK_BIOMETRIC_KEY, enabled ? "1" : "0");
}

export type BiometricFailure =
  | "cancelled"
  | "no_screen_lock"
  | "lockout"
  | "unavailable"
  | "unknown";

export type BiometricResult =
  | { success: true }
  | { success: false; reason: BiometricFailure };

function toBiometricFailure(error: string | undefined): BiometricFailure {
  switch (error) {
    case "user_cancel":
    case "app_cancel":
    case "system_cancel":
      return "cancelled";
    // Raised when the phone itself has no PIN, pattern or password, which
    // BiometricPrompt requires before it will run at all.
    case "not_enrolled":
      return "no_screen_lock";
    case "lockout":
    case "lockout_permanent":
      return "lockout";
    case "not_available":
      return "unavailable";
    default:
      return "unknown";
  }
}

export async function authenticateWithBiometrics(
  promptMessage: string,
  fallbackLabel: string,
): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel,
      // The PIN keypad behind this prompt is the fallback, so skip the OS one.
      disableDeviceFallback: true,
      cancelLabel: fallbackLabel,
    });

    if (result.success) return { success: true };
    return { success: false, reason: toBiometricFailure(result.error) };
  } catch {
    return { success: false, reason: "unknown" };
  }
}
