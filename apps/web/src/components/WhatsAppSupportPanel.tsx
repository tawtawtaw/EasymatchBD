"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { buildWhatsAppChatUrl } from "@/lib/whatsapp-support";

const QUICK_TOPIC_KEYS = [
  "account",
  "browse",
  "verification",
  "privacy",
  "general",
] as const;

type QuickTopicKey = (typeof QUICK_TOPIC_KEYS)[number];

type WhatsAppSupportPanelProps = {
  phoneDigits: string;
  fabId: string;
};

export function WhatsAppSupportPanel({
  phoneDigits,
  fabId,
}: WhatsAppSupportPanelProps) {
  const t = useTranslations("whatsappSupport");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const fab = document.getElementById(fabId);
    if (!fab) return;

    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      setOpen((value) => !value);
    };

    fab.addEventListener("click", onClick);
    return () => fab.removeEventListener("click", onClick);
  }, [fabId]);

  function openChat(topic: QuickTopicKey) {
    const message = t(`topics.${topic}.message`);
    const url = buildWhatsAppChatUrl(phoneDigits, message);
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  if (!portalReady || !open) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[10000] flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-6 sm:bottom-24 sm:p-0"
      role="presentation"
    >
      <div
        className="pointer-events-auto w-full max-w-[22rem] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        role="dialog"
        aria-label={t("panelTitle")}
      >
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{t("panelTitle")}</p>
              <p className="mt-1 text-xs text-emerald-50">{t("panelSubtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm text-emerald-50 hover:bg-white/10"
              aria-label={t("close")}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto p-4 sm:max-h-none">
          <p className="text-xs font-medium text-zinc-500">{t("quickTopics")}</p>
          {QUICK_TOPIC_KEYS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => openChat(topic)}
              className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5 text-left text-sm text-zinc-800 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <span>{t(`topics.${topic}.label`)}</span>
              <span className="text-emerald-700">→</span>
            </button>
          ))}
        </div>

        <div className="border-t border-zinc-100 px-4 py-3">
          <button
            type="button"
            onClick={() => openChat("general")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {t("chatNow")}
          </button>
          <p className="mt-2 text-center text-[11px] text-zinc-500">
            {t("opensWhatsApp", { locale: locale.toUpperCase() })}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
