import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { isSeoPrivatePath } from "./lib/seo";
import { SITE_URL } from "./lib/site-url";

const handleI18nRouting = createMiddleware(routing);

const APEX_HOST = new URL(SITE_URL).host;

/** Drop middleware Link/hreflang so only HTML alternates (apex + locales) remain. */
function stripAlternateLinkHeaders(response: NextResponse) {
  const link = response.headers.get("link");
  if (!link) return;
  const kept = link
    .split(",")
    .map((part) => part.trim())
    .filter((part) => !/;\s*rel=["']?alternate["']?/i.test(part));
  if (kept.length === 0) {
    response.headers.delete("link");
  } else {
    response.headers.set("link", kept.join(", "));
  }
}

export function proxy(request: NextRequest) {
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  )
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .replace(/:\d+$/, "");

  // Belt-and-suspenders if platform host matching skips Next redirects.
  if (host === "www.easymatchbd.com" || host === `www.${APEX_HOST}`) {
    const destination = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      SITE_URL,
    );
    return NextResponse.redirect(destination, 308);
  }

  const pathname = request.nextUrl.pathname;
  request.headers.set("x-pathname", pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const forwarded = new NextRequest(request.url, { headers: requestHeaders });
  const response = handleI18nRouting(forwarded);
  stripAlternateLinkHeaders(response);
  if (isSeoPrivatePath(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
