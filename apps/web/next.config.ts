import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** Dev-only rewrite target when NEXT_PUBLIC_API_URL is unset (matches @easymatch/shared). */
const LOCAL_API_PORT = 4101;

const ngrokDevOrigin = process.env.NGROK_DEV_ORIGIN?.trim();

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
  // Lets Next dev accept requests via ngrok (e.g. easymatchbd.ngrok.dev).
  ...(ngrokDevOrigin ? { allowedDevOrigins: [ngrokDevOrigin] } : {}),
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
