/** Bundled official-style SSLCommerz payment-methods banner (Apr 2026 asset). */
export const DEFAULT_SSLCOMMERZ_PAYMENT_BANNER_PATH =
  "/images/sslcommerz-payment-banner.png";

/** Show official SSLCommerz footer banner only after merchant gateway approval. */
export function isSslCommerzGatewayApproved(): boolean {
  return process.env.NEXT_PUBLIC_SSLCOMMERZ_GATEWAY_APPROVED === "true";
}

/** Optional override; otherwise the bundled footer banner is used when approved. */
export function getSslCommerzBannerImageUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SSLCOMMERZ_BANNER_URL?.trim();
  return url || null;
}

export function resolveSslCommerzFooterBannerSrc(): string {
  return getSslCommerzBannerImageUrl() ?? DEFAULT_SSLCOMMERZ_PAYMENT_BANNER_PATH;
}
