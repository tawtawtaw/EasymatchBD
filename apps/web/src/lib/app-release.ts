import {
  ANDROID_APK_PUBLIC_PATH,
  type PublicAndroidAppRelease,
} from "@easymatch/shared";
import { getApiBaseUrl } from "@/lib/api-base-url";

const emptyRelease: PublicAndroidAppRelease = {
  available: false,
  versionCode: null,
  versionName: null,
  fileSizeBytes: null,
  publishedAt: null,
  apkPath: ANDROID_APK_PUBLIC_PATH,
};

export function androidApkHref(): string {
  return "/download/android.apk";
}

export function originFromRequestHeaders(headersList: Headers): string {
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  if (!host) return "";
  const forwardedProto = headersList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export function buildDownloadPageUrl(origin: string, locale: string): string {
  if (!origin) return "";
  return `${origin.replace(/\/$/, "")}/${locale}/download`;
}

function releaseApiBase(): string {
  if (typeof window === "undefined") {
    return getApiBaseUrl();
  }
  return "/api/v1";
}

export async function getPublicAndroidAppRelease(): Promise<PublicAndroidAppRelease> {
  try {
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined" && window.location.hostname.includes("ngrok")) {
      headers["ngrok-skip-browser-warning"] = "1";
    }
    const res = await fetch(`${releaseApiBase()}/public/app/latest`, {
      cache: "no-store",
      headers,
    });
    if (!res.ok) return emptyRelease;
    return (await res.json()) as PublicAndroidAppRelease;
  } catch {
    return emptyRelease;
  }
}
