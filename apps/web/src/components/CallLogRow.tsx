"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  formatVideoCallDuration,
  formatVideoCallLogWhen,
  isHighlightedMissedCall,
  videoCallDurationSeconds,
  videoCallLogTitleKey,
  videoCallOccurredAt,
} from "@easymatch/shared";
import type { VideoCallItem } from "@/lib/video-calls";

function VideoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect
        x="3"
        y="6.5"
        width="12.5"
        height="11"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M15.5 10.5 21 8v8l-5.5-2.5v-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type CallLogRowProps = {
  call: VideoCallItem;
  partnerName?: string | null;
  showPartner?: boolean;
  canCallBack?: boolean;
  calling?: boolean;
  onCallAgain?: () => void;
};

export function CallLogRow({
  call,
  partnerName,
  showPartner = false,
  canCallBack = true,
  calling = false,
  onCallAgain,
}: CallLogRowProps) {
  const locale = useLocale();
  const t = useTranslations("videoCalls.log");
  const missed = isHighlightedMissedCall(call.status);
  const titleKey = videoCallLogTitleKey(call.status);
  const occurredAt = videoCallOccurredAt(call);
  const duration = videoCallDurationSeconds(call.startedAt, call.endedAt);
  const direction = call.isInitiator ? t("outgoing") : t("incoming");
  const detail = duration
    ? `${direction} · ${formatVideoCallDuration(duration)}`
    : direction;

  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          missed ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-600"
        }`}
      >
        <VideoGlyph className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        {showPartner && partnerName ? (
          <p
            className={`truncate text-sm font-semibold ${
              missed ? "text-red-700" : "text-zinc-900"
            }`}
          >
            {partnerName}
          </p>
        ) : null}
        <p
          className={`truncate text-sm ${
            showPartner && partnerName
              ? "text-zinc-500"
              : missed
                ? "font-semibold text-red-700"
                : "font-medium text-zinc-800"
          }`}
        >
          {t(titleKey)}
        </p>
        <p className="truncate text-xs text-zinc-500">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-zinc-500">
          {formatVideoCallLogWhen(occurredAt, locale, t("yesterday"))}
        </span>
        {canCallBack && onCallAgain ? (
          <button
            type="button"
            onClick={onCallAgain}
            disabled={calling}
            title={t("callAgain")}
            aria-label={t("callAgain")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-rose-800 hover:bg-rose-50 disabled:opacity-50"
          >
            <VideoGlyph className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
