"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DisconnectReason } from "livekit-client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { endVideoCall } from "@/lib/video-calls";
import { getMemberLiveKitToken } from "@/lib/video-call-guests";
import {
  persistVideoCallEnded,
  shouldEndCallAfterLiveKitDisconnect,
  VIDEO_CALL_MAX_RECONNECT_ATTEMPTS,
} from "@/lib/video-call-disconnect";
import { LiveKitVideoCallRoom } from "@/components/LiveKitVideoCallRoom";
import {
  isVideoCallPath,
  useGlobalCallSession,
} from "@/components/GlobalCallSessionProvider";
import { useMemberAlerts } from "@/components/MemberAlertsProvider";

export const CALL_VIDEO_SLOT_ID = "easymatch-call-video-slot";

function useSlotLayout(slotEl: HTMLElement | null, active: boolean) {
  const [layout, setLayout] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!active || !slotEl) {
      setLayout(null);
      return;
    }

    const update = () => {
      const rect = slotEl.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) {
        return;
      }
      setLayout({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(slotEl);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, slotEl]);

  return layout;
}

export function GlobalLiveKitCallHost() {
  const t = useTranslations("videoCalls");
  const pathname = usePathname();
  const { session, clearCallSession, patchCallSession } = useGlobalCallSession();
  const { refresh } = useMemberAlerts();
  const [ending, setEnding] = useState(false);
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const finalizeInFlightRef = useRef(false);

  const finalizeAbortedCall = useCallback(
    async (callId: string) => {
      if (finalizeInFlightRef.current) return;
      finalizeInFlightRef.current = true;
      reconnectAttemptsRef.current = 0;
      patchCallSession({ phase: "ended", livekit: undefined });
      clearCallSession();
      await persistVideoCallEnded(callId);
      await refresh({ forceFresh: true });
      finalizeInFlightRef.current = false;
    },
    [clearCallSession, patchCallSession, refresh],
  );

  const handleUnexpectedDisconnect = useCallback(
    (reason?: DisconnectReason) => {
      if (!session || reason === DisconnectReason.CLIENT_INITIATED) return;
      const callId = session.callId;

      if (shouldEndCallAfterLiveKitDisconnect(reason)) {
        void finalizeAbortedCall(callId);
        return;
      }

      if (reconnectAttemptsRef.current >= VIDEO_CALL_MAX_RECONNECT_ATTEMPTS) {
        void finalizeAbortedCall(callId);
        return;
      }

      reconnectAttemptsRef.current += 1;
      patchCallSession({ phase: "connecting", livekit: undefined });

      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      reconnectTimerRef.current = window.setTimeout(() => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
          void finalizeAbortedCall(callId);
          return;
        }
        void getMemberLiveKitToken(token, callId)
          .then((lk) => {
            if (!lk.configured || !lk.url || !lk.token) {
              throw new Error("LiveKit unavailable");
            }
            reconnectAttemptsRef.current = 0;
            patchCallSession({
              phase: "active",
              livekit: {
                url: lk.url,
                token: lk.token,
                sessionKey: Date.now(),
              },
            });
          })
          .catch(() => {
            if (
              reconnectAttemptsRef.current >= VIDEO_CALL_MAX_RECONNECT_ATTEMPTS
            ) {
              void finalizeAbortedCall(callId);
            } else {
              handleUnexpectedDisconnect(reason);
            }
          });
      }, 2000);
    },
    [finalizeAbortedCall, patchCallSession, session],
  );

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  const onCallPage = isVideoCallPath(pathname);
  const livekit = session?.livekit;
  const inActiveCall =
    session?.phase === "active" ||
    session?.phase === "connecting" ||
    (session?.phase === "loading" && Boolean(livekit));

  const showMedia = Boolean(livekit && inActiveCall);

  useEffect(() => {
    if (!onCallPage) {
      setSlotEl(null);
      return;
    }
    const sync = () => {
      setSlotEl(document.getElementById(CALL_VIDEO_SLOT_ID));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [onCallPage, pathname]);

  const slotLayout = useSlotLayout(slotEl, onCallPage && showMedia);

  const handleEnd = useCallback(async () => {
    if (!session || ending) return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setEnding(true);
    try {
      await endVideoCall(token, session.callId);
      clearCallSession();
      await refresh({ forceFresh: true });
    } catch {
      clearCallSession();
    } finally {
      setEnding(false);
    }
  }, [clearCallSession, ending, refresh, session]);

  if (!showMedia || !session || !livekit) {
    return null;
  }

  const memberName = session.memberName?.trim() || t("unknownMember");
  const callHref = `/messages/${session.connectionId}/call?callId=${encodeURIComponent(session.callId)}`;

  const expandedOnCallPage = onCallPage && slotLayout;

  return (
    <div
      className={
        expandedOnCallPage
          ? "fixed z-[85] flex flex-col overflow-hidden bg-zinc-950 shadow-lg"
          : "fixed bottom-4 right-4 z-[90] flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-zinc-600 bg-zinc-950 shadow-2xl"
      }
      style={
        expandedOnCallPage
          ? {
              top: slotLayout.top,
              left: slotLayout.left,
              width: slotLayout.width,
              height: slotLayout.height,
            }
          : undefined
      }
      role="region"
      aria-label={expandedOnCallPage ? t("title") : t("dockLabel")}
    >
      {!expandedOnCallPage ? (
        <div className="flex items-center justify-between gap-2 border-b border-zinc-700 bg-zinc-900 px-3 py-2">
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-white">{memberName}</p>
            <p className="text-xs text-zinc-400">{t("dockInCall")}</p>
          </div>
          <Link
            href={callHref}
            className="shrink-0 rounded-lg bg-rose-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
          >
            {t("dockExpand")}
          </Link>
        </div>
      ) : null}
      <div
        className={
          expandedOnCallPage
            ? "relative min-h-0 flex-1 bg-black"
            : "relative aspect-video max-h-48 w-full bg-black"
        }
      >
        <LiveKitVideoCallRoom
          key={livekit.sessionKey}
          serverUrl={livekit.url}
          token={livekit.token}
          embeddedMobile={!expandedOnCallPage}
          showEndCall
          ending={ending}
          onEndCall={() => void handleEnd()}
          onDisconnected={(reason) => {
            if (reason === DisconnectReason.CLIENT_INITIATED) {
              return;
            }
            handleUnexpectedDisconnect(reason);
          }}
        />
      </div>
    </div>
  );
}
