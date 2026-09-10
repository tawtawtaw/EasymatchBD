/** Canonical public origin for sitemap, robots, and absolute links. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  process.env.WEB_PUBLIC_URL?.trim() ||
  "https://easymatchbd.com"
).replace(/\/$/, "");
