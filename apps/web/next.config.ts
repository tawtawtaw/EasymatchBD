import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** Dev-only rewrite target when NEXT_PUBLIC_API_URL is unset (matches @easymatch/shared). */
const LOCAL_API_PORT = 4101;

/** Next.js allowedDevOrigins expects hostnames only (no https://). */
function normalizeAllowedDevOriginHost(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).host;
    }
  } catch {
    /* use trimmed value below */
  }
  return trimmed.replace(/\/$/, "");
}

const allowedDevOrigins = [
  "easymatchbd.ngrok.dev",
  ...(process.env.NGROK_DEV_ORIGIN ?? "")
    .split(",")
    .map(normalizeAllowedDevOriginHost)
    .filter(Boolean),
].filter((host, index, all) => all.indexOf(host) === index);

/** Accept either var on Railway; Next inlines NEXT_PUBLIC_* at build time. */
const whatsappSupportNumber =
  process.env.WHATSAPP_SUPPORT_NUMBER?.trim() ||
  process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER?.trim();

const repoRoot = path.join(__dirname, "../../");
const isNextDev = process.argv.includes("dev");

const nextConfig: NextConfig = {
  output: "standalone",
  // Standalone Railway builds must trace workspace packages from the repo root.
  outputFileTracingRoot: repoRoot,
  // `next dev` + a repo-wide Turbopack root watches api/mobile/image trees and
  // eventually OOMs (~7GB). Pin the web app in development only.
  turbopack: {
    root: isNextDev ? __dirname : repoRoot,
  },
  transpilePackages: ["@easymatch/shared"],
  ...(whatsappSupportNumber
    ? {
        env: {
          NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER: whatsappSupportNumber,
        },
      }
    : {}),
  experimental: {
    preloadEntriesOnStart: false,
    proxyClientMaxBodySize: "200mb",
  },
  typescript: {
    // Pre-existing strict TS issues; dev uses `next dev` without blocking on these.
    ignoreBuildErrors: true,
  },
  // HMR + dev assets when using ngrok (hostname only — see normalizeAllowedDevOriginHost).
  allowedDevOrigins,
  async redirects() {
    // Consolidate www → apex so Google does not pick a different host canonical
    // than the user-declared tags / sitemap (https://easymatchbd.com).
    const wwwToApex = { type: "host" as const, value: "www.easymatchbd.com" };
    return [
      {
        source: "/",
        has: [wwwToApex],
        destination: "https://easymatchbd.com/",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [wwwToApex],
        destination: "https://easymatchbd.com/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
    const apiBase = configured
      ? configured.replace(/\/$/, "")
      : `http://127.0.0.1:${LOCAL_API_PORT}/api/v1`;
    return [
      {
        source: "/download/android.apk",
        destination: `${apiBase}/public/app/android.apk`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
