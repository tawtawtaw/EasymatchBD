import { NextResponse } from "next/server";
import { ANDROID_APK_PUBLIC_PATH } from "@easymatch/shared";
import { getApiBaseUrl } from "@/lib/api-base-url";

export const dynamic = "force-dynamic";

type AndroidDownloadTarget = {
  mode: "redirect" | "stream";
  url: string | null;
  fileName: string;
};

/**
 * Same-origin APK link that never proxies the APK body through Next/Railway web.
 * Supabase: 302 to a signed URL. Local disk: 302 to the API stream endpoint.
 */
export async function GET() {
  const apiBase = getApiBaseUrl();
  try {
    const res = await fetch(`${apiBase}/public/app/android-download`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return new NextResponse("Android app is not available", {
        status: res.status === 404 ? 404 : 502,
      });
    }
    const target = (await res.json()) as AndroidDownloadTarget;
    if (target.mode === "redirect" && target.url) {
      return NextResponse.redirect(target.url, 302);
    }
    return NextResponse.redirect(`${apiBase}${ANDROID_APK_PUBLIC_PATH}`, 302);
  } catch {
    return new NextResponse("Could not start the Android download", {
      status: 502,
    });
  }
}
