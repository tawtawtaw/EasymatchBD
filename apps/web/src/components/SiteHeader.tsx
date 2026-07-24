import { getTranslations } from "next-intl/server";
import { SiteHeaderClient } from "./SiteHeaderClient";

export async function SiteHeader() {
  const t = await getTranslations("common");

  return (
    <header id="site-header" className="relative z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <SiteHeaderClient brand={t("brand")} />
      </div>
    </header>
  );
}
