export const ANDROID_APK_PUBLIC_PATH = "/public/app/android.apk";
export const ANDROID_APP_DOWNLOAD_PATH = "/download";

export const ANDROID_VERSION_NAME_MAX = 32;
export const ANDROID_VERSION_CODE_MIN = 1;
export const ANDROID_VERSION_CODE_MAX = 2_147_483_647;

export type PublicAndroidAppRelease = {
  available: boolean;
  versionCode: number | null;
  versionName: string | null;
  fileSizeBytes: number | null;
  publishedAt: string | null;
  apkPath: typeof ANDROID_APK_PUBLIC_PATH;
};

export type AdminAndroidAppRelease = {
  id: string;
  versionCode: number;
  versionName: string;
  fileName: string;
  fileSizeBytes: number;
  isCurrent: boolean;
  publishedAt: string;
};

export type AdminAndroidAppReleaseStatus = {
  current: AdminAndroidAppRelease | null;
  nextVersionCode: number;
  history: AdminAndroidAppRelease[];
};

export function isValidAndroidVersionName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > ANDROID_VERSION_NAME_MAX) {
    return false;
  }
  return /^[0-9A-Za-z][0-9A-Za-z._+-]*$/.test(trimmed);
}

export function parseAndroidVersionCode(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : NaN;
  if (!Number.isInteger(n) || n < ANDROID_VERSION_CODE_MIN || n > ANDROID_VERSION_CODE_MAX) {
    return null;
  }
  return n;
}
