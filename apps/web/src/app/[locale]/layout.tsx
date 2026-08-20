import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_Bengali } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { FeatureCommandPaletteProvider } from "@/components/FeatureCommandPalette";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { StaffAlertsProvider } from "@/components/StaffAlertsProvider";
import { MemberAlertsProvider } from "@/components/MemberAlertsProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { VideoCallAlertsBanner } from "@/components/VideoCallAlertsBanner";
import { ConnectionEndedAlertsBanner } from "@/components/ConnectionEndedAlertsBanner";
import { GlobalCallSessionProvider } from "@/components/GlobalCallSessionProvider";
import { CallRuntimeUi } from "@/components/CallRuntimeUi";
import { ChunkLoadRecovery } from "@/components/ChunkLoadRecovery";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import { LocaleShell } from "@/components/LocaleShell";
import { DocumentLocale } from "@/components/DocumentLocale";

const geistSans = Geist({
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  const bodyFont =
    locale === "bn" ? notoBengali.className : geistSans.className;

  return (
    <div
      lang={locale}
      className={`${bodyFont} ${geistMono.variable} min-h-dvh bg-white text-zinc-950 antialiased`}
    >
      <DocumentLocale locale={locale} />
      <ChunkLoadRecovery />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AuthSessionProvider>
          <StaffAlertsProvider>
            <MemberAlertsProvider>
              <GlobalCallSessionProvider>
                <FeatureCommandPaletteProvider>
                  <CallRuntimeUi />
                  <LocaleShell
                    header={
                      <>
                        <SiteHeader />
                        <ConnectionEndedAlertsBanner />
                        <VideoCallAlertsBanner variant="global" />
                      </>
                    }
                    footer={<SiteFooter />}
                    widgets={<WhatsAppSupport />}
                  >
                    {children}
                  </LocaleShell>
                </FeatureCommandPaletteProvider>
              </GlobalCallSessionProvider>
            </MemberAlertsProvider>
          </StaffAlertsProvider>
        </AuthSessionProvider>
      </NextIntlClientProvider>
    </div>
  );
}
