import { EASYMATCH_API_PORT } from "@easymatch/shared";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const ngrokDevOrigin = process.env.NGROK_DEV_ORIGIN?.trim();

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@easymatch/shared"],
  experimental: {
    preloadEntriesOnStart: false,
  },
  typescript: {
    // Pre-existing strict TS issues; dev uses `next dev` without blocking on these.
    ignoreBuildErrors: true,
  },
  // Lets Next dev accept requests via ngrok (e.g. easymatchbd.ngrok.dev).
  ...(ngrokDevOrigin ? { allowedDevOrigins: [ngrokDevOrigin] } : {}),
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `http://127.0.0.1:${EASYMATCH_API_PORT}/api/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
