"use client";

import { useLayoutEffect } from "react";

/** Keeps <html lang> in sync after Next.js moved html/body to the root layout. */
export function DocumentLocale({ locale }: { locale: string }) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.classList.add("light");
  }, [locale]);

  return null;
}
