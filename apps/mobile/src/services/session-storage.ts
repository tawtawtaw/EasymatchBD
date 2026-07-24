import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAuthImageHeadersCache } from "../lib/auth-image-headers";
import {
  AUTH_TOKEN_KEY,
  DEVICE_PHONE_KEY,
  DEVICE_TOKEN_KEY,
  PUSH_TOKEN_KEY,
} from "../constants/storage-keys";

let memoryAccessToken: string | null | undefined;

export const sessionStorage = {
  async getAccessToken(): Promise<string | null> {
    if (memoryAccessToken !== undefined) {
      return memoryAccessToken;
    }
    memoryAccessToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return memoryAccessToken;
  },

  async setAccessToken(token: string): Promise<void> {
    memoryAccessToken = token;
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  async clearAccessToken(): Promise<void> {
    memoryAccessToken = null;
    clearAuthImageHeadersCache();
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  },

  async getDeviceSession(): Promise<{ deviceToken: string; phone: string } | null> {
    const [deviceToken, phone] = await Promise.all([
      AsyncStorage.getItem(DEVICE_TOKEN_KEY),
      AsyncStorage.getItem(DEVICE_PHONE_KEY),
    ]);
    if (!deviceToken || !phone) return null;
    return { deviceToken, phone };
  },

  async setDeviceSession(deviceToken: string, phone: string): Promise<void> {
    await AsyncStorage.multiSet([
      [DEVICE_TOKEN_KEY, deviceToken],
      [DEVICE_PHONE_KEY, phone],
    ]);
  },

  async clearDeviceSession(): Promise<void> {
    await AsyncStorage.multiRemove([DEVICE_TOKEN_KEY, DEVICE_PHONE_KEY]);
  },

  async getPushToken(): Promise<string | null> {
    return AsyncStorage.getItem(PUSH_TOKEN_KEY);
  },

  async setPushToken(token: string): Promise<void> {
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  },

  async clearAll(): Promise<void> {
    memoryAccessToken = null;
    clearAuthImageHeadersCache();
    await AsyncStorage.multiRemove([
      AUTH_TOKEN_KEY,
      DEVICE_TOKEN_KEY,
      DEVICE_PHONE_KEY,
    ]);
  },
};
