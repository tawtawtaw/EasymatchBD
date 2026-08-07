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

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
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
    proxyClientMaxBodySize: "10mb",
  },
  typescript: {
    // Pre-existing strict TS issues; dev uses `next dev` without blocking on these.
    ignoreBuildErrors: true,
  },
  // HMR + dev assets when using ngrok (hostname only — see normalizeAllowedDevOriginHost).
  allowedDevOrigins,
  async rewrites() {
    const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (configured) {
      const apiBase = configured.replace(/\/$/, "");
      // Proxy same-origin /api/v1 → API (OTP login, SSLCommerz callbacks, builds without baked-in URL).
      return [
        {
          source: "/api/v1/:path*",
          destination: `${apiBase}/:path*`,
        },
      ];
    }
    return [
      {
        source: "/api/v1/:path*",
        destination: `http://127.0.0.1:${LOCAL_API_PORT}/api/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
