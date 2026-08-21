"use client";

import { formatVideoCallRemaining } from "@easymatch/shared";
import { useTranslations } from "next-intl";

export function VideoCallDurationWarning({
  remainingMs,
  compact = false,
}: {
  remainingMs: number;
  compact?: boolean;
}) {
  const t = useTranslations("videoCalls");

  return (
    <p
      role="status"
      className={
        compact
          ? "bg-amber-500 px-3 py-1.5 text-center text-xs font-semibold text-zinc-950"
          : "mx-4 mt-3 rounded-lg bg-amber-500 px-3 py-2 text-center text-sm font-semibold text-zinc-950"
      }
    >
      {t("durationWarning", { time: formatVideoCallRemaining(remainingMs) })}
    </p>
  );
}
