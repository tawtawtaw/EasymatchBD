import type { Metadata, Viewport } from "next";
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
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import { LocaleShell } from "@/components/LocaleShell";
import "../globals.css";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
    <html lang={locale} className="light" suppressHydrationWarning>
      <body
        className={`${bodyFont} ${geistMono.variable} bg-white text-zinc-950 antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthSessionProvider>
            <StaffAlertsProvider>
            <MemberAlertsProvider>
              <FeatureCommandPaletteProvider>
                <LocaleShell
                  header={
                    <>
                      <SiteHeader />
                      <VideoCallAlertsBanner variant="global" />
                    </>
                  }
                  footer={<SiteFooter />}
                  widgets={<WhatsAppSupport />}
                >
                  {children}
                </LocaleShell>
              </FeatureCommandPaletteProvider>
            </MemberAlertsProvider>
            </StaffAlertsProvider>
          </AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
