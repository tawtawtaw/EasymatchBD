import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

let secureStoreAvailable: boolean | null = null;

async function canUseSecureStore(): Promise<boolean> {
  if (secureStoreAvailable === null) {
    try {
      secureStoreAvailable = await SecureStore.isAvailableAsync();
    } catch {
      secureStoreAvailable = false;
    }
  }
  return secureStoreAvailable;
}

/** Reads a secret, lifting any pre-SecureStore value out of AsyncStorage once. */
export async function readSecure(key: string): Promise<string | null> {
  if (!(await canUseSecureStore())) {
    return AsyncStorage.getItem(key);
  }

  try {
    const current = await SecureStore.getItemAsync(key);
    if (current !== null) return current;
  } catch {
    return AsyncStorage.getItem(key);
  }

  const legacy = await AsyncStorage.getItem(key);
  if (legacy === null) return null;

  await writeSecure(key, legacy);
  await AsyncStorage.removeItem(key);
  return legacy;
}

export async function writeSecure(key: string, value: string): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      // Keystore can be unavailable on some devices; degrade rather than lose the value.
    }
  }
  await AsyncStorage.setItem(key, value);
}

export async function deleteSecure(key: string): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore and still clear the AsyncStorage copy below.
    }
  }
  await AsyncStorage.removeItem(key);
}
