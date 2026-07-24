"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { signOut } from "@/lib/auth-session";

type TermsDeclinedViewProps = {
  onRetry: () => void;
};

export function TermsDeclinedView({ onRetry }: TermsDeclinedViewProps) {
  const t = useTranslations("terms");

  function handleSignOut() {
    signOut();
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-rose-50 to-white px-4 py-16">
      <div className="max-w-md space-y-6 rounded-2xl border border-zinc-300 bg-white p-8 shadow-md text-center">
        <h1 className="text-xl font-bold text-zinc-900">{t("declinedTitle")}</h1>
        <p className="text-sm text-zinc-700">{t("declinedMessage")}</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-rose-700 px-4 py-3 font-semibold text-white hover:bg-rose-800"
          >
            {t("reviewAgain")}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 px-4 py-3 font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            {t("backHome")}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            {t("signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
