"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: Locale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white p-1 text-sm font-semibold shadow-sm"
      role="group"
      aria-label={t("language")}
    >
      <button
        type="button"
        onClick={() => switchLocale("en")}
        className={`rounded-full px-3 py-1.5 transition ${
          locale === "en"
            ? "bg-rose-700 text-white"
            : "text-zinc-700 hover:bg-zinc-100"
        }`}
      >
        {t("english")}
      </button>
      <button
        type="button"
        onClick={() => switchLocale("bn")}
        className={`rounded-full px-3 py-1.5 transition ${
          locale === "bn"
            ? "bg-rose-700 text-white"
            : "text-zinc-700 hover:bg-zinc-100"
        }`}
      >
        {t("bangla")}
      </button>
    </div>
  );
}
