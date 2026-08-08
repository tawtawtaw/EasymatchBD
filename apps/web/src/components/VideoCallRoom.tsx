"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  acceptVideoCall,
  canJoinScheduledCall,
  declineVideoCall,
  endVideoCall,
  cancelVideoCall,
  getLiveKitStatus,
  getVideoCall,
  pollVideoCallSignals,
  postVideoCallSignal,
  startScheduledVideoCall,
  WEBRTC_ICE_SERVERS,
  type VideoCallItem,
} from "@/lib/video-calls";
import { getMemberLiveKitToken } from "@/lib/video-call-guests";
import {
  CALL_VIDEO_SLOT_ID,
} from "@/components/GlobalLiveKitCallHost";
import { LiveKitVideoCallRoom } from "@/components/LiveKitVideoCallRoom";
import { VideoCallGuestPanel } from "@/components/VideoCallGuestPanel";
import {
  phaseFromCallStatus,
  useGlobalCallSession,
} from "@/components/GlobalCallSessionProvider";
import { useMemberAlerts } from "@/components/MemberAlertsProvider";
import { unlockVideoCallRingtone } from "@/lib/video-call-ringtone";
import { notifyMobileVideoCallState } from "@/lib/mobile-video-call";
import { DisconnectReason } from "livekit-client";
import {
  shouldEndCallAfterLiveKitDisconnect,
  VIDEO_CALL_MAX_RECONNECT_ATTEMPTS,
  NATIVE_SHELL_VIDEO_CALL_MAX_RECONNECT_ATTEMPTS,
} from "@/lib/video-call-disconnect";

type VideoCallRoomProps = {
  connectionId: string;
  callId: string;
  memberName: string;
  embeddedMobile?: boolean;
  nativeShell?: boolean;
  autoJoin?: boolean;
};

function formatScheduledWhen(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function VideoCallRoom({
  connectionId,
  callId,
  memberName,
  embeddedMobile = false,
  nativeShell = false,
  autoJoin = false,
}: VideoCallRoomProps) {
  const t = useTranslations("videoCalls");
  const locale = useLocale();
  const [call, setCall] = useState<VideoCallItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [startingScheduled, setStartingScheduled] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitConfigured, setLivekitConfigured] = useState<boolean | null>(
    null,
  );
  const [connectionLost, setConnectionLost] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [livekitSessionKey, setLivekitSessionKey] = useState(0);
  const [livekitMediaReady, setLivekitMediaReady] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalCursorRef = useRef<string | undefined>(undefined);
  const webrtcStartedRef = useRef(false);
  const endingIntentionallyRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);
  const autoJoinAttemptedRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const [joiningCall, setJoiningCall] = useState(autoJoin);
  const [callUiEnded, setCallUiEnded] = useState(false);
  const persistActiveCallRef = useRef(false);
  const livekitSnapshotRef = useRef({
    url: null as string | null,
    token: null as string | null,
    sessionKey: 0,
  });
  const {
    session: globalCallSession,
    setCallSession,
    patchCallSession,
    suppressIncomingCall,
    clearCallSession,
  } = useGlobalCallSession();
  const { refresh: refreshMemberAlerts, dismissIncomingCall } =
    useMemberAlerts();

  const syncAlertsAfterCallAction = useCallback(async () => {
    dismissIncomingCall(callId);
    suppressIncomingCall(callId);
    await refreshMemberAlerts({ forceFresh: true });
  }, [
    callId,
    dismissIncomingCall,
    refreshMemberAlerts,
    suppressIncomingCall,
  ]);

  const refreshCall = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    if (refreshInFlightRef.current) {
      return null;
    }

    refreshInFlightRef.current = true;
    try {
      const current = await getVideoCall(token, callId);
      setCall(current);
      return current;
    } catch {
      return null;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [callId]);

  useEffect(() => {
    setCallSession((current) => {
      if (
        current?.callId === callId &&
        current.livekit &&
        (current.phase === "active" || current.phase === "connecting")
      ) {
        return {
          ...current,
          connectionId,
          memberName,
          joining: joiningCall,
        };
      }
      return {
        callId,
        connectionId,
        memberName,
        phase: "loading",
        joining: joiningCall,
        livekit: current?.callId === callId ? current.livekit : undefined,
      };
    });

    return () => {
      setCallSession((current) => {
        if (!current || current.callId !== callId) {
          return current;
        }
        if (persistActiveCallRef.current) {
          const snap = livekitSnapshotRef.current;
          return {
            ...current,
            memberName,
            livekit:
              snap.url && snap.token
                ? {
                    url: snap.url,
                    token: snap.token,
                    sessionKey: snap.sessionKey,
                  }
                : current.livekit,
          };
        }
        if (current.phase === "active" || current.phase === "connecting") {
          return current;
        }
        return null;
      });
    };
  }, [callId, connectionId, joiningCall, memberName, setCallSession]);

  useEffect(() => {
    if (globalCallSession?.callId !== callId || !globalCallSession.livekit) {
      return;
    }
    setLivekitUrl(globalCallSession.livekit.url);
    setLivekitToken(globalCallSession.livekit.token);
    setLivekitSessionKey(globalCallSession.livekit.sessionKey);
    setLivekitConfigured(true);
  }, [callId, globalCallSession?.callId, globalCallSession?.livekit]);

  useEffect(() => {
    livekitSnapshotRef.current = {
      url: livekitUrl,
      token: livekitToken,
      sessionKey: livekitSessionKey,
    };
    if (livekitUrl && livekitToken) {
      patchCallSession({
        livekit: {
          url: livekitUrl,
          token: livekitToken,
          sessionKey: livekitSessionKey,
        },
        memberName,
      });
    }
  }, [
    livekitUrl,
    livekitToken,
    livekitSessionKey,
    memberName,
    patchCallSession,
  ]);

  useEffect(() => {
    persistActiveCallRef.current = call?.status === "active";
  }, [call?.status]);

  useEffect(() => {
    if (!call) return;
    patchCallSession({
      callId,
      connectionId,
      phase: phaseFromCallStatus(call.status, call.isInitiator),
      joining: joiningCall,
    });
  }, [call, callId, connectionId, joiningCall, patchCallSession]);

  useEffect(() => {
    if (!call) return;
    const terminal = new Set([
      "completed",
      "cancelled",
      "declined",
      "missed",
    ]);
    if (!terminal.has(call.status)) return;

    suppressIncomingCall(callId);
    dismissIncomingCall(callId);
    clearCallSession();
    void refreshMemberAlerts({ forceFresh: true });
  }, [
    call?.status,
    callId,
    clearCallSession,
    dismissIncomingCall,
    refreshMemberAlerts,
    suppressIncomingCall,
  ]);

  useEffect(() => {
    if (!nativeShell) return;
    notifyMobileVideoCallState("loading");
  }, [nativeShell]);

  useEffect(() => {
    void refreshCall().catch((err) => {
      setError(err instanceof Error ? err.message : t("actions.error"));
    });
  }, [refreshCall, t]);

  useEffect(() => {
    const terminal = new Set([
      "completed",
      "cancelled",
      "declined",
      "missed",
    ]);
    if (call && terminal.has(call.status)) {
      return;
    }

    const intervalMs =
      call?.status === "ringing"
        ? call.isInitiator
          ? 2_000
          : 2_500
        : call?.status === "active" && livekitToken
          ? 20_000
          : call?.status === "active"
            ? 8_000
            : 5_000;
    const interval = window.setInterval(() => {
      void refreshCall();
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [call, livekitToken, refreshCall]);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    void getLiveKitStatus(token)
      .then((status) => setLivekitConfigured(status.configured))
      .catch(() => setLivekitConfigured(null));
  }, []);

  const cleanupMedia = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    webrtcStartedRef.current = false;
    signalCursorRef.current = undefined;
    setLivekitUrl(null);
    setLivekitToken(null);
  }, []);

  const releaseWarmUpStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (!persistActiveCallRef.current) {
        cleanupMedia();
      }
    };
  }, [cleanupMedia]);

  const loadLiveKit = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return false;

    const existing = globalCallSession?.livekit;
    if (
      globalCallSession?.callId === callId &&
      existing?.url &&
      existing.token
    ) {
      releaseWarmUpStream();
      setLivekitConfigured(true);
      setLivekitUrl(existing.url);
      setLivekitToken(existing.token);
      setLivekitSessionKey(existing.sessionKey);
      setConnectionLost(false);
      reconnectAttemptsRef.current = 0;
      patchCallSession({
        phase: "active",
        livekit: existing,
        memberName,
      });
      return true;
    }

    releaseWarmUpStream();
    try {
      const session = await getMemberLiveKitToken(token, callId);
      if (!session.configured) {
        setLivekitConfigured(false);
        return false;
      }
      releaseWarmUpStream();
      setLivekitConfigured(true);
      setLivekitUrl(session.url);
      setLivekitToken(session.token);
      setConnectionLost(false);
      reconnectAttemptsRef.current = 0;
      patchCallSession({
        phase: "connecting",
        livekit: {
          url: session.url,
          token: session.token,
          sessionKey: livekitSessionKey,
        },
        memberName,
      });
      return true;
    } catch (err) {
      if (call?.status === "active") {
        setError(err instanceof Error ? err.message : t("actions.error"));
      }
      return false;
    }
  }, [
    call?.status,
    callId,
    globalCallSession?.callId,
    globalCallSession?.livekit,
    memberName,
    patchCallSession,
    releaseWarmUpStream,
    t,
  ]);

  const warmUpMedia = useCallback(async () => {
    if (localStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch {
      /* wait until active to show permission error */
    }
  }, []);

  useEffect(() => {
    if (livekitConfigured !== true) return;
    releaseWarmUpStream();
  }, [livekitConfigured, releaseWarmUpStream]);

  useEffect(() => {
    if (!call || autoStartAttemptedRef.current) return;
    if (call.status !== "scheduled" || !call.scheduledAt) return;
    if (!canJoinScheduledCall(call.scheduledAt)) return;

    autoStartAttemptedRef.current = true;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setStartingScheduled(true);
    void startScheduledVideoCall(token, callId)
      .then((updated) => {
        setCall(updated);
        if (!updated.isInitiator && updated.status === "ringing") {
          return;
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("actions.error"));
      })
      .finally(() => setStartingScheduled(false));
  }, [call, callId, t]);

  const processSignals = useCallback(
    async (pc: RTCPeerConnection, token: string) => {
      const signals = await pollVideoCallSignals(
        token,
        callId,
        signalCursorRef.current,
      );
      for (const signal of signals) {
        signalCursorRef.current = signal.createdAt;
        if (signal.type === "offer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(
              signal.payload as RTCSessionDescriptionInit,
            ),
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await postVideoCallSignal(token, callId, "answer", {
            type: answer.type,
            sdp: answer.sdp,
          });
        } else if (signal.type === "answer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(
              signal.payload as RTCSessionDescriptionInit,
            ),
          );
        } else if (signal.type === "ice") {
          await pc.addIceCandidate(
            new RTCIceCandidate(signal.payload as RTCIceCandidateInit),
          );
        }
      }
    },
    [callId],
  );

  const startWebRtc = useCallback(
    async (current: VideoCallItem) => {
      if (webrtcStartedRef.current || current.status !== "active") return;
      webrtcStartedRef.current = true;

      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      try {
        if (!localStreamRef.current) {
          await warmUpMedia();
        }
        const stream = localStreamRef.current;
        if (!stream) {
          throw new Error(t("mediaPermissionDenied"));
        }

        const pc = new RTCPeerConnection({ iceServers: WEBRTC_ICE_SERVERS });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        };

        pc.onicecandidate = (event) => {
          if (!event.candidate) return;
          void postVideoCallSignal(token, callId, "ice", event.candidate.toJSON());
        };

        if (current.isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postVideoCallSignal(token, callId, "offer", {
            type: offer.type,
            sdp: offer.sdp,
          });
        }

        const poll = window.setInterval(() => {
          if (!pcRef.current) {
            window.clearInterval(poll);
            return;
          }
          void processSignals(pcRef.current, token).catch(() => undefined);
        }, 800);

        void processSignals(pc, token);
      } catch (err) {
        setMediaError(
          err instanceof Error ? err.message : t("mediaPermissionDenied"),
        );
        webrtcStartedRef.current = false;
      }
    },
    [callId, processSignals, t, warmUpMedia],
  );

  useEffect(() => {
    if (call?.status !== "active") return;

    if (
      globalCallSession?.callId === callId &&
      globalCallSession.livekit?.url &&
      globalCallSession.livekit.token
    ) {
      setLivekitUrl(globalCallSession.livekit.url);
      setLivekitToken(globalCallSession.livekit.token);
      setLivekitSessionKey(globalCallSession.livekit.sessionKey);
      setLivekitConfigured(true);
      setConnectionLost(false);
      return;
    }

    void loadLiveKit();
  }, [
    call?.status,
    callId,
    globalCallSession?.callId,
    globalCallSession?.livekit,
    loadLiveKit,
    reconnectAttempt,
  ]);

  useEffect(() => {
    if (call?.status === "active" && livekitConfigured === false) {
      void startWebRtc(call);
    }
  }, [call, livekitConfigured, startWebRtc]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  async function handleAccept() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setError(null);
    setJoiningCall(true);
    patchCallSession({ joining: true, phase: "connecting" });
    try {
      const updated = await acceptVideoCall(token, callId);
      setCall(updated);
      suppressIncomingCall(callId);
      dismissIncomingCall(callId);
      patchCallSession({
        phase: phaseFromCallStatus(updated.status, updated.isInitiator),
        joining: false,
      });
      void refreshMemberAlerts({ forceFresh: true });
      void loadLiveKit();
    } catch (err) {
      patchCallSession({
        phase: phaseFromCallStatus(call?.status, call?.isInitiator ?? false),
        joining: false,
      });
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setJoiningCall(false);
    }
  }

  useEffect(() => {
    if (!autoJoin || !call || call.isInitiator) return;
    if (autoJoinAttemptedRef.current) return;

    if (call.status === "active") {
      autoJoinAttemptedRef.current = true;
      setJoiningCall(true);
      void loadLiveKit().finally(() => setJoiningCall(false));
      return;
    }

    if (call.status !== "ringing") return;

    autoJoinAttemptedRef.current = true;
    unlockVideoCallRingtone();
    void handleAccept();
  }, [autoJoin, call, loadLiveKit]);

  async function handleDecline() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    try {
      await declineVideoCall(token, callId);
      cleanupMedia();
      await syncAlertsAfterCallAction();
      clearCallSession();
      await refreshCall();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    }
  }

  async function handleEnd() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || ending) return;

    const terminal = new Set([
      "completed",
      "cancelled",
      "declined",
      "missed",
    ]);
    if (call && terminal.has(call.status)) {
      cleanupMedia();
      return;
    }

    if (endingIntentionallyRef.current) return;
    endingIntentionallyRef.current = true;
    setCallUiEnded(true);
    setJoiningCall(false);
    patchCallSession({ phase: "ended", livekit: undefined, joining: false });
    setEnding(true);
    try {
      if (call?.status === "ringing" && call.isInitiator) {
        await cancelVideoCall(token, callId);
      } else {
        await endVideoCall(token, callId);
      }
      cleanupMedia();
      await syncAlertsAfterCallAction();
      clearCallSession();
      await refreshCall();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("actions.error");
      if (!message.toLowerCase().includes("not in progress")) {
        setError(message);
      } else {
        cleanupMedia();
        await syncAlertsAfterCallAction();
        clearCallSession();
        await refreshCall();
      }
    } finally {
      setEnding(false);
    }
  }

  function handleLiveKitDisconnected(reason?: DisconnectReason) {
    if (endingIntentionallyRef.current || call?.status !== "active") {
      return;
    }
    if (reason === DisconnectReason.CLIENT_INITIATED) {
      return;
    }

    const maxReconnectAttempts = nativeShell
      ? NATIVE_SHELL_VIDEO_CALL_MAX_RECONNECT_ATTEMPTS
      : VIDEO_CALL_MAX_RECONNECT_ATTEMPTS;

    if (shouldEndCallAfterLiveKitDisconnect(reason)) {
      setConnectionLost(true);
      setMediaError(t("connectionLost"));
      setLivekitUrl(null);
      setLivekitToken(null);
      patchCallSession({ livekit: undefined, phase: "connecting" });
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionLost(true);
      setMediaError(t("connectionLost"));
      return;
    }

    reconnectAttemptsRef.current += 1;
    setConnectionLost(true);
    setLivekitUrl(null);
    setLivekitToken(null);
    patchCallSession({ livekit: undefined, phase: "connecting" });

    if (reconnectTimerRef.current != null) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    reconnectTimerRef.current = window.setTimeout(() => {
      setReconnectAttempt((attempt) => attempt + 1);
      setLivekitSessionKey((key) => key + 1);
      void loadLiveKit().then((connected) => {
        if (connected) {
          reconnectAttemptsRef.current = 0;
          setConnectionLost(false);
          return;
        }
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionLost(true);
          setMediaError(t("connectionLost"));
          return;
        } else {
          setConnectionLost(true);
        }
      });
    }, 2000);
  }

  const ended =
    callUiEnded ||
    (call &&
      ["completed", "cancelled", "declined", "missed"].includes(call.status));

  const useLiveKit =
    call?.status === "active" &&
    livekitConfigured === true &&
    livekitUrl &&
    livekitToken;

  const connectingVideo =
    call?.status === "active" &&
    livekitConfigured === true &&
    (!livekitUrl || !livekitToken);

  useEffect(() => {
    if (!useLiveKit) {
      setLivekitMediaReady(false);
      return;
    }
    releaseWarmUpStream();
    const timer = window.setTimeout(() => setLivekitMediaReady(true), 400);
    return () => window.clearTimeout(timer);
  }, [useLiveKit, livekitSessionKey, releaseWarmUpStream]);

  useEffect(() => {
    if (!nativeShell || !call) return;
    if (joiningCall || (autoJoin && call.status === "ringing" && !call.isInitiator)) {
      notifyMobileVideoCallState("joining");
      return;
    }
    if (ended) {
      notifyMobileVideoCallState("ended");
      return;
    }
    if (connectingVideo) {
      notifyMobileVideoCallState("connecting");
      return;
    }
    if (call.status === "active") {
      notifyMobileVideoCallState("active");
      return;
    }
    if (call.status === "ringing") {
      notifyMobileVideoCallState("ringing");
    }
  }, [nativeShell, call, joiningCall, autoJoin, connectingVideo, ended]);

  return (
    <div
      className={`flex flex-col bg-zinc-900 text-white ${
        embeddedMobile
          ? "easymatch-mobile-call-shell flex h-full min-h-0 flex-1 flex-col overflow-y-auto shadow-none"
          : useLiveKit
            ? "flex max-h-[calc(100dvh-6rem)] min-h-0 flex-col overflow-y-auto rounded-xl border border-zinc-200 shadow-lg"
            : "min-h-[70vh] rounded-xl border border-zinc-200 shadow-lg"
      }`}
    >
      {!embeddedMobile ? (
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              {t("title")}
            </p>
            <h1 className="text-lg font-semibold">{memberName}</h1>
          </div>
          <Link
            href={`/messages/${connectionId}`}
            className="rounded-lg border border-zinc-600 px-3 py-1 text-sm hover:bg-zinc-800"
          >
            {t("backToChat")}
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className="mx-4 mt-3 rounded-lg bg-red-900/50 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
      {mediaError ? (
        <p className="mx-4 mt-3 rounded-lg bg-amber-900/50 px-3 py-2 text-sm text-amber-100">
          {mediaError}
        </p>
      ) : null}
      {connectionLost ? (
        <p className="mx-4 mt-3 rounded-lg bg-amber-900/50 px-3 py-2 text-sm text-amber-100">
          {t("connectionLost")}
        </p>
      ) : null}

      {!call ? (
        <p className="flex flex-1 items-center justify-center text-zinc-400">
          {t("loadingCall")}
        </p>
      ) : ended ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <p className="text-lg">
            {call
              ? t(`status.${call.status}`)
              : t("status.completed")}
          </p>
          <Link
            href={`/messages/${connectionId}`}
            className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold hover:bg-rose-900"
          >
            {t("backToChat")}
          </Link>
        </div>
      ) : call.status === "scheduled" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-semibold">{t("scheduledWaitingTitle")}</p>
          {call.scheduledAt ? (
            <p className="text-sm text-zinc-300">
              {t("scheduledWaitingWhen", {
                when: formatScheduledWhen(call.scheduledAt, locale),
              })}
            </p>
          ) : null}
          <p className="max-w-md text-sm text-zinc-400">
            {canJoinScheduledCall(call.scheduledAt ?? "")
              ? startingScheduled
                ? t("startingScheduled")
                : t("scheduledWaitingHint")
              : t("scheduledTooEarly")}
          </p>
          {canJoinScheduledCall(call.scheduledAt ?? "") ? (
            <button
              type="button"
              disabled={startingScheduled || ending}
              onClick={() => {
                const token = localStorage.getItem(AUTH_TOKEN_KEY);
                if (!token) return;
                setStartingScheduled(true);
                void startScheduledVideoCall(token, callId)
                  .then(setCall)
                  .catch((err) =>
                    setError(
                      err instanceof Error ? err.message : t("actions.error"),
                    ),
                  )
                  .finally(() => setStartingScheduled(false));
              }}
              className="rounded-full bg-rose-800 px-6 py-3 text-sm font-semibold hover:bg-rose-900 disabled:opacity-60"
            >
              {t("joinScheduled")}
            </button>
          ) : null}
        </div>
      ) : joiningCall || (autoJoin && call.status === "ringing" && !call.isInitiator) ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-lg font-semibold">{t("joiningCall")}</p>
          <p className="max-w-sm text-sm text-zinc-400">{t("connectingVideo")}</p>
        </div>
      ) : call.status === "ringing" && !call.isInitiator ? (
        <div
          className={`flex flex-1 flex-col items-center justify-center gap-4 p-6 ${
            nativeShell ? "easymatch-hide-in-native" : ""
          }`}
        >
          <p className="text-xl font-semibold">{t("incomingCall")}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                unlockVideoCallRingtone();
                void handleAccept();
              }}
              className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold hover:bg-emerald-500"
            >
              {t("accept")}
            </button>
            <button
              type="button"
              onClick={() => void handleDecline()}
              className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold hover:bg-red-600"
            >
              {t("decline")}
            </button>
          </div>
        </div>
      ) : call.status === "ringing" && call.isInitiator ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-lg font-semibold">{t("ringing")}</p>
          <p className="max-w-sm text-sm text-zinc-400">
            {call.scheduledAt ? t("scheduledRingingHint") : t("instantRingingHint")}
          </p>
          <div className="flex gap-1 pt-1" aria-hidden="true">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400 [animation-delay:300ms]" />
          </div>
          <button
            type="button"
            disabled={ending}
            onClick={() => void handleEnd()}
            className={`rounded-lg border border-zinc-500 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60 ${
              nativeShell ? "easymatch-hide-in-native" : ""
            }`}
          >
            {t("cancelCall")}
          </button>
        </div>
      ) : !ended && connectingVideo ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-lg font-semibold">{t("connectingVideo")}</p>
          <p className="max-w-sm text-sm text-zinc-400">{t("partnerJoining")}</p>
        </div>
      ) : useLiveKit ? (
        <>
          {embeddedMobile || nativeShell ? (
            livekitMediaReady ? (
              <LiveKitVideoCallRoom
                key={livekitSessionKey}
                serverUrl={livekitUrl!}
                token={livekitToken!}
                embeddedMobile={embeddedMobile}
                nativeShell={nativeShell}
                showEndCall
                ending={ending}
                onEndCall={() => void handleEnd()}
                onDisconnected={handleLiveKitDisconnected}
                onMediaDeviceError={(_source, error) => {
                  setMediaError(error.message);
                  if (nativeShell) {
                    notifyMobileVideoCallState("active", {
                      mediaError: error.message,
                    });
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center px-4 py-8 text-sm text-zinc-400">
                {t("connectingVideo")}
              </div>
            )
          ) : (
            <div
              id={CALL_VIDEO_SLOT_ID}
              className="relative flex min-h-[min(70dvh,32rem)] flex-1 flex-col bg-black"
            />
          )}
          <VideoCallGuestPanel
            callId={callId}
            callActive
            livekitConfigured={livekitConfigured}
            compactMobile={embeddedMobile}
          />
        </>
      ) : (
        <>
          <div className="relative flex-1 bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 h-28 w-40 rounded-lg border border-zinc-600 object-cover shadow-lg"
            />
          </div>
          <div
            className={`flex justify-center gap-3 border-t border-zinc-700 p-4 ${
              nativeShell ? "easymatch-hide-in-native" : ""
            }`}
          >
            <button
              type="button"
              disabled={ending}
              onClick={() => void handleEnd()}
              className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
            >
              {t("endCall")}
            </button>
          </div>
          <VideoCallGuestPanel
            callId={callId}
            callActive={call.status === "active"}
            livekitConfigured={livekitConfigured}
            compactMobile={embeddedMobile}
          />
        </>
      )}
    </div>
  );
}
