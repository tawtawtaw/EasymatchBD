import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { FacebookIcon } from "@/components/FacebookIcon";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { YouTubeIcon } from "@/components/YouTubeIcon";
import {
  buildWhatsAppSupportHref,
  getContactEmail,
  getFacebookPageUrl,
  getYouTubeChannelUrl,
} from "@/lib/site-social";
import { SslCommerzFooterBanner } from "@/components/SslCommerzFooterBanner";

export async function SiteFooter() {
  await connection();
  const t = await getTranslations("footer");
  const whatsappHref = buildWhatsAppSupportHref(t("whatsappMessage"));
  const facebookHref = getFacebookPageUrl();
  const youtubeHref = getYouTubeChannelUrl();
  const contactEmail = getContactEmail();

  const linkClass =
    "text-sm text-rose-100/85 transition hover:text-white hover:underline underline-offset-4";

  return (
    <footer id="footer" className="bg-gradient-to-br from-rose-950 via-rose-900 to-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-5 lg:col-span-5">
            <div>
              <Link href="/" className="text-2xl font-bold tracking-tight text-white">
                EasymatchBD
              </Link>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-rose-100/80">
                {t("tagline")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-200/70">
                {t("followUs")}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href={facebookHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("facebook")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/15"
                >
                  <FacebookIcon className="h-4 w-4" />
                  {t("facebook")}
                </a>
                <a
                  href={youtubeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("youtube")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/15"
                >
                  <YouTubeIcon className="h-4 w-4" />
                  {t("youtube")}
                </a>
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("whatsapp")}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-50 transition hover:border-emerald-300/50 hover:bg-emerald-500/25"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    {t("whatsapp")}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-white">{t("company")}</p>
              <nav className="mt-4 flex flex-col gap-3">
                <Link href="/cookies" className={linkClass}>
                  {t("cookiesPolicy")}
                </Link>
                <Link href="/about" className={linkClass}>
                  {t("aboutUs")}
                </Link>
                <Link href="/privacy" className={linkClass}>
                  {t("privacyPolicy")}
                </Link>
                <Link href="/payment-security" className={linkClass}>
                  {t("paymentSecurityPolicy")}
                </Link>
                <Link href="/privacy/fields" className={linkClass}>
                  {t("privacyFieldGuide")}
                </Link>
                <Link href="/terms" className={linkClass}>
                  {t("terms")}
                </Link>
                <Link href="/refund" className={linkClass}>
                  {t("refundPolicy")}
                </Link>
                <Link href="/service-delivery" className={linkClass}>
                  {t("serviceDeliveryPolicy")}
                </Link>
              </nav>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">{t("platform")}</p>
              <nav className="mt-4 flex flex-col gap-3">
                <Link href="/membership" className={linkClass}>
                  {t("membershipPlans")}
                </Link>
                <Link href="/#success-stories" className={linkClass}>
                  {t("successStories")}
                </Link>
                <Link href="/#privacy-levels" className={linkClass}>
                  {t("howPrivacyWorks")}
                </Link>
                <Link href="/browse" className={linkClass}>
                  {t("browse")}
                </Link>
              </nav>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">{t("support")}</p>
              <nav className="mt-4 flex flex-col gap-3">
                <Link href="/contact" className={linkClass}>
                  {t("contact")}
                </Link>
                <Link href="/#faq" className={linkClass}>
                  {t("faq")}
                </Link>
                {contactEmail ? (
                  <a href={`mailto:${contactEmail}`} className={linkClass}>
                    {contactEmail}
                  </a>
                ) : null}
              </nav>
            </div>
          </div>
        </div>

        <SslCommerzFooterBanner
          ariaLabel={t("sslCommerzBannerAria")}
          imageAlt={t("sslCommerzBannerAlt")}
        />

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-rose-100/60 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p className="text-xs text-rose-100/50">{t("madeForBd")}</p>
        </div>
      </div>
    </footer>
  );
}
