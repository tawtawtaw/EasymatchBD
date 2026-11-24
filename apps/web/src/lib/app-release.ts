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
    (isLoopbackHost(host) ? "http" : "https");
  return `${proto}://${host}`;
}

function isLoopbackHost(hostOrUrl: string): boolean {
  const host = hostOrUrl.includes("://")
    ? safeUrlHost(hostOrUrl)
    : hostOrUrl.split(":")[0]?.toLowerCase() ?? "";
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1"
  );
}

function safeUrlHost(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Origin encoded into the download QR. Must be reachable from a phone camera,
 * so localhost is replaced by NGROK / the configured public site URL.
 */
export function publicOriginForQr(headersList: Headers): string {
  const requestOrigin = originFromRequestHeaders(headersList);
  const configured = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.WEB_PUBLIC_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  const ngrok = (process.env.NGROK_DEV_ORIGIN ?? "").trim().replace(/\/$/, "");

  if (requestOrigin && !isLoopbackHost(requestOrigin)) {
    return requestOrigin;
  }
  if (ngrok) {
    return ngrok;
  }
  if (configured && !isLoopbackHost(configured)) {
    return configured;
  }
  return requestOrigin;
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
