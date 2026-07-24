import { getTranslations, setRequestLocale } from "next-intl/server";
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

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contactPage");
  const whatsappHref = buildWhatsAppSupportHref(t("whatsappMessage"));
  const contactEmail = getContactEmail();
  const facebookHref = getFacebookPageUrl();
  const youtubeHref = getYouTubeChannelUrl();

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
          {t("backHome")}
        </Link>

        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="text-base leading-relaxed text-zinc-600">{t("intro")}</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                <WhatsAppIcon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-semibold text-zinc-900">{t("whatsappTitle")}</h2>
              <p className="mt-2 text-sm text-zinc-600">{t("whatsappBody")}</p>
              <span className="mt-4 text-sm font-semibold text-emerald-800">
                {t("whatsappAction")} →
              </span>
            </a>
          ) : null}

          <a
            href={facebookHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white">
              <FacebookIcon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-zinc-900">{t("facebookTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-600">{t("facebookBody")}</p>
            <span className="mt-4 text-sm font-semibold text-blue-800">
              {t("facebookAction")} →
            </span>
          </a>

          <a
            href={youtubeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm transition hover:border-red-300 hover:shadow-md"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FF0000] text-white">
              <YouTubeIcon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-zinc-900">{t("youtubeTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-600">{t("youtubeBody")}</p>
            <span className="mt-4 text-sm font-semibold text-red-800">
              {t("youtubeAction")} →
            </span>
          </a>

          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-rose-200 hover:shadow-md"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-700 text-sm font-bold text-white">
                @
              </span>
              <h2 className="mt-4 font-semibold text-zinc-900">{t("emailTitle")}</h2>
              <p className="mt-2 text-sm text-zinc-600">{t("emailBody")}</p>
              <span className="mt-4 text-sm font-semibold text-rose-800">{contactEmail}</span>
            </a>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-zinc-900">{t("supportTitle")}</h2>
              <p className="mt-2 text-sm text-zinc-600">{t("supportBody")}</p>
            </div>
          )}
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900">{t("hoursTitle")}</h2>
          <p className="mt-2 text-sm text-zinc-600">{t("hoursBody")}</p>
        </section>
      </div>
    </div>
  );
}
