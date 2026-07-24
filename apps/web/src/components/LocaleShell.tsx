"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/routing";

function isMobileEmbedPath(pathname: string): boolean {
  return /\/mobile\/video-call(?:\/|$)/.test(pathname);
}

type Props = {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  widgets: ReactNode;
};

/** Switches between full site chrome and a minimal shell for in-app WebView pages. */
export function LocaleShell({ children, header, footer, widgets }: Props) {
  const pathname = usePathname();
  const embedded = isMobileEmbedPath(pathname);

  if (embedded) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white">{children}</div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen flex-col">
        {header}
        <main className="flex-1">{children}</main>
        {footer}
      </div>
      {widgets}
    </>
  );
}
