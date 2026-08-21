"use client";

import type { ComponentProps } from "react";
import { Link } from "@/i18n/routing";

type LocaleHref = ComponentProps<typeof Link>["href"];

type Props = {
  message: string;
  label: string | null;
  href: string | null;
  learnMore: string;
};

export function MarketingBannerBar({ message, label, href, learnMore }: Props) {
  if (!message) return null;

  return (
    <div className="sticky top-0 z-50 border-b border-rose-900 bg-gradient-to-r from-rose-800 via-rose-700 to-amber-600 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm sm:px-6">
        {label ? (
          <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
            {label}
          </span>
        ) : null}
        <p className="font-medium leading-snug">{message}</p>
        {href ? (
          <Link
            href={href as LocaleHref}
            className="font-semibold underline decoration-white/70 underline-offset-2 hover:decoration-white"
          >
            {learnMore}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
