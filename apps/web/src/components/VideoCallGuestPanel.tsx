"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { MAX_VIDEO_CALL_GUESTS_PER_SIDE, VIDEO_CALL_GUEST_RELATIONS } from "@easymatch/shared";
import {
  isNativeVideoCallShell,
  shareViaNativeShell,
} from "@/lib/mobile-video-call";
import {
  approveVideoCallGuest,
  declineVideoCallGuest,
  inviteVideoCallGuest,
  listVideoCallGuests,
  revokeVideoCallGuest,
  type VideoCallGuestItem,
} from "@/lib/video-call-guests";

type VideoCallGuestPanelProps = {
  callId: string;
  callActive: boolean;
  livekitConfigured: boolean | null;
  enabled?: boolean;
  compactMobile?: boolean;
};

export function VideoCallGuestPanel({
  callId,
  callActive,
  livekitConfigured,
  enabled = true,
  compactMobile = false,
}: VideoCallGuestPanelProps) {
  const t = useTranslations("videoCalls.guests");
  const tf = useTranslations("videoCalls.guests.relations");
  const [guests, setGuests] = useState<VideoCallGuestItem[]>([]);
  const [guestName, setGuestName] = useState("");
  const [relation, setRelation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);
  const guestsRef = useRef(guests);
  guestsRef.current = guests;

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    try {
      const list = await listVideoCallGuests(token, callId);
      setGuests(list);
    } catch {
      /* background refresh */
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [callId]);

  useEffect(() => {
    if (!enabled) return;

    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      const currentGuests = guestsRef.current;
      const pending = currentGuests.some(
        (guest) =>
          guest.needsMyApproval || guest.status === "pending_approval",
      );
      const hasGuests = currentGuests.length > 0;
      if (!pending && !hasGuests) return;
      void refresh();
    }, callActive ? 20_000 : 30_000);
    return () => window.clearInterval(interval);
  }, [callActive, enabled, refresh]);

  if (!enabled) {
    return null;
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !guestName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await inviteVideoCallGuest(
        token,
        callId,
        guestName.trim(),
        relation || undefined,
      );
      setGuestName("");
      setRelation("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(guestId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await approveVideoCallGuest(token, callId, guestId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline(guestId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setLoading(true);
    try {
      await declineVideoCallGuest(token, callId, guestId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(guestId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setLoading(true);
    try {
      await revokeVideoCallGuest(token, callId, guestId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function copyInviteLink(guest: VideoCallGuestItem) {
    if (!guest.inviteUrl) return;
    // The WebView has no dependable clipboard, so hand off to the share sheet.
    if (isNativeVideoCallShell() && shareViaNativeShell(guest.inviteUrl)) {
      return;
    }
    try {
      await navigator.clipboard.writeText(guest.inviteUrl);
      setCopiedId(guest.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError(t("copyFailed"));
    }
  }

  if (livekitConfigured === false) {
    return (
      <section className="border-t border-zinc-700 px-4 py-3 text-sm text-zinc-300">
        <p className="font-medium text-white">{t("title")}</p>
        <p className="mt-1 text-zinc-400">{t("livekitRequired")}</p>
      </section>
    );
  }

  return (
    <section
      className={`border-t border-zinc-700 px-4 py-4 ${
        compactMobile ? "easymatch-guest-panel--mobile shrink-0 pb-6" : ""
      }`}
    >
      <h2 className="text-sm font-semibold text-white">{t("title")}</h2>
      <p className="mt-1 text-xs text-zinc-400">{t("subtitle", { max: MAX_VIDEO_CALL_GUESTS_PER_SIDE })}</p>

      {error ? (
        <p className="mt-2 rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      {callActive ? (
        <form
          onSubmit={(event) => void handleInvite(event)}
          className={`mt-3 flex gap-2 ${
            compactMobile
              ? "flex-col items-stretch"
              : "flex-wrap items-end"
          }`}
        >
          <label
            className={`flex flex-col gap-1 text-xs text-zinc-400 ${
              compactMobile ? "w-full" : "min-w-[10rem] flex-1"
            }`}
          >
            {t("guestName")}
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-white"
              placeholder={t("guestNamePlaceholder")}
            />
          </label>
          <label
            className={`flex flex-col gap-1 text-xs text-zinc-400 ${
              compactMobile ? "w-full" : ""
            }`}
          >
            {t("relation")}
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-white"
            >
              <option value="">{t("relationOptional")}</option>
              {VIDEO_CALL_GUEST_RELATIONS.map((key) => (
                <option key={key} value={key}>
                  {tf(key)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loading || !guestName.trim()}
            className={`rounded-lg bg-rose-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60 ${
              compactMobile ? "w-full py-2.5" : ""
            }`}
          >
            {t("invite")}
          </button>
        </form>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">{t("inviteWhenActive")}</p>
      )}

      {guests.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {guests.map((guest) => (
            <li
              key={guest.id}
              className="rounded-lg bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{guest.guestName}</span>
                  {guest.relation ? (
                    <span className="ml-2 text-xs text-zinc-400">
                      ({tf(guest.relation as never)})
                    </span>
                  ) : null}
                  <span className="ml-2 text-xs text-zinc-500">
                    {t(`status.${guest.status}`)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {guest.needsMyApproval ? (
                    <>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleApprove(guest.id)}
                        className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60"
                      >
                        {t("approve")}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleDecline(guest.id)}
                        className="rounded border border-zinc-500 px-2 py-1 text-xs hover:bg-zinc-700 disabled:opacity-60"
                      >
                        {t("decline")}
                      </button>
                    </>
                  ) : null}
                  {guest.canRevoke &&
                  ["pending_approval", "approved"].includes(guest.status) ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void handleRevoke(guest.id)}
                      className="rounded border border-zinc-500 px-2 py-1 text-xs hover:bg-zinc-700 disabled:opacity-60"
                    >
                      {t("revoke")}
                    </button>
                  ) : null}
                  {guest.inviteUrl &&
                  ["approved", "pending_approval"].includes(guest.status) ? (
                    <button
                      type="button"
                      onClick={() => void copyInviteLink(guest)}
                      className="rounded border border-zinc-500 px-2 py-1 text-xs hover:bg-zinc-700"
                    >
                      {copiedId === guest.id
                        ? t("copied")
                        : isNativeVideoCallShell()
                          ? t("shareLink")
                          : t("copyLink")}
                    </button>
                  ) : null}
                </div>
              </div>
              {guest.status === "pending_approval" ? (
                <p className="mt-1 text-xs text-amber-200/90">{t("pendingHint")}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
