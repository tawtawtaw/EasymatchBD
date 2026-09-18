import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function LocaleNotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "notFound" });

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-semibold text-rose-800">404</p>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">{t("title")}</h1>
      <p className="mt-3 text-zinc-600">{t("body")}</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"
      >
        {t("home")}
      </Link>
    </main>
  );
}
