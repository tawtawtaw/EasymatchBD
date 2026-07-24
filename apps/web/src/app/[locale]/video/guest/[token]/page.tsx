"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  fetchGuestLobby,
  joinGuestVideoCall,
  type GuestLobby,
} from "@/lib/video-call-guests";
import { LiveKitVideoCallRoom } from "@/components/LiveKitVideoCallRoom";

export default function GuestVideoCallPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const t = useTranslations("videoCalls.guests");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [lobby, setLobby] = useState<GuestLobby | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [session, setSession] = useState<{
    url: string;
    token: string;
    guestName: string;
  } | null>(null);

  useEffect(() => {
    void params.then((value) => setInviteToken(value.token));
  }, [params]);

  const refreshLobby = useCallback(async () => {
    if (!inviteToken) return;
    try {
      const data = await fetchGuestLobby(inviteToken);
      setLobby(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [inviteToken, t]);

  useEffect(() => {
    if (!inviteToken) return;
    void refreshLobby();
    const interval = window.setInterval(() => void refreshLobby(), 4000);
    return () => window.clearInterval(interval);
  }, [inviteToken, refreshLobby]);

  async function handleJoin() {
    if (!inviteToken) return;
    setJoining(true);
    setError(null);
    try {
      const data = await joinGuestVideoCall(inviteToken);
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setJoining(false);
    }
  }

  if (!inviteToken || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-zinc-600">
        Loading…
      </main>
    );
  }

  if (session) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-zinc-900">
            {t("lobbyTitle")} — {session.guestName}
          </h1>
        </div>
        <LiveKitVideoCallRoom
          serverUrl={session.url}
          token={session.token}
          onDisconnected={() => setSession(null)}
        />
      </main>
    );
  }

  const blocked =
    lobby?.status === "declined" ||
    lobby?.status === "expired" ||
    lobby?.callStatus === "completed" ||
    lobby?.callStatus === "cancelled";

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">{t("lobbyTitle")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("lobbySubtitle")}</p>

        {lobby ? (
          <div className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm">
            <p className="font-medium text-zinc-900">{lobby.guestName}</p>
            {lobby.relation ? (
              <p className="text-zinc-600">
                {t(`relations.${lobby.relation as "father"}`)}
              </p>
            ) : null}
            <p className="mt-1 text-zinc-500">
              {t(`status.${lobby.status}`)}
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {!lobby?.livekitConfigured ? (
          <p className="mt-4 text-sm text-amber-800">{t("notConfigured")}</p>
        ) : blocked ? (
          <p className="mt-4 text-sm text-zinc-600">
            {lobby?.status === "expired"
              ? t("inviteExpired")
              : lobby?.status === "declined"
                ? t("inviteDeclined")
                : t("callEnded")}
          </p>
        ) : lobby?.status === "pending_approval" ? (
          <p className="mt-4 text-sm text-amber-800">{t("waitingApproval")}</p>
        ) : lobby?.callStatus !== "active" ? (
          <p className="mt-4 text-sm text-zinc-600">{t("waitingCall")}</p>
        ) : (
          <button
            type="button"
            disabled={joining}
            onClick={() => void handleJoin()}
            className="mt-6 w-full rounded-lg bg-rose-800 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
          >
            {t("joinCall")}
          </button>
        )}
      </div>
    </main>
  );
}
