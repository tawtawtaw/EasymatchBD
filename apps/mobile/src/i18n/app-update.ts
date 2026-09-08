import type { AppLocale } from "../lib/locale";

const appUpdate = {
  en: {
    title: "New version available",
    body: "Version {name} is ready. Download the update to keep using the latest EasymatchBD features.",
    download: "Download update",
    later: "Not now",
  },
  bn: {
    title: "নতুন ভার্সন এসেছে",
    body: "ভার্সন {name} প্রস্তুত। নতুন ফিচার পেতে আপডেট ডাউনলোড করুন।",
    download: "আপডেট ডাউনলোড",
    later: "এখন না",
  },
} as const;

export function tAppUpdate(locale: AppLocale) {
  return appUpdate[locale];
}
