import {
  isSslCommerzGatewayApproved,
  resolveSslCommerzFooterBannerSrc,
} from "@/lib/sslcommerz-gateway";

type SslCommerzFooterBannerProps = {
  ariaLabel: string;
  imageAlt: string;
};

export function SslCommerzFooterBanner({
  ariaLabel,
  imageAlt,
}: SslCommerzFooterBannerProps) {
  if (!isSslCommerzGatewayApproved()) {
    return null;
  }

  const bannerSrc = resolveSslCommerzFooterBannerSrc();

  return (
    <div className="mt-10 border-t border-white/10 pt-8">
      <a
        href="https://www.sslcommerz.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className="mx-auto block max-w-4xl rounded-lg bg-white/95 px-4 py-4 shadow-sm transition hover:bg-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bannerSrc}
          alt={imageAlt}
          className="mx-auto h-auto w-full max-w-full object-contain"
          width={960}
          height={120}
        />
      </a>
    </div>
  );
}
