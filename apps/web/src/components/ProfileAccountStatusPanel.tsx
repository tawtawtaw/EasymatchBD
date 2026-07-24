"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { notifyAuthChanged } from "@/lib/auth-session";
import {
  PROFILE_ACCOUNT_STATUS_SECTION_ID,
  pauseMyProfile,
  reactivateMyProfile,
} from "@/lib/profile-pause";

type Props = {
  isPaused: boolean;
  pausedAt?: string | null;
  onStatusChange?: (isPaused: boolean) => void;
};

export function ProfileAccountStatusPanel({
  isPaused,
  pausedAt,
  onStatusChange,
}: Props) {
  const t = useTranslations("profile.accountStatus");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPause, setConfirmPause] = useState(false);

  async function handlePause() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await pauseMyProfile(token);
      setConfirmPause(false);
      onStatusChange?.(true);
      notifyAuthChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pauseFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await reactivateMyProfile(token);
      onStatusChange?.(false);
      notifyAuthChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reactivateFailed"));
    } finally {
      setBusy(false);
    }
  }

  const pausedWhen =
    pausedAt &&
    !Number.isNaN(new Date(pausedAt).getTime())
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(pausedAt))
      : null;

  return (
    <section
      id={PROFILE_ACCOUNT_STATUS_SECTION_ID}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm scroll-mt-24"
    >
      <h2 className="text-base font-semibold text-zinc-900">{t("title")}</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {isPaused ? t("pausedDescription") : t("activeDescription")}
      </p>
      {isPaused && pausedWhen ? (
        <p className="mt-2 text-xs text-zinc-500">{t("pausedSince", { when: pausedWhen })}</p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {isPaused ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleReactivate()}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {busy ? t("reactivating") : t("reactivate")}
          </button>
        ) : confirmPause ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handlePause()}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {busy ? t("pausing") : t("confirmPause")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmPause(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {t("cancel")}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmPause(true)}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            {t("pause")}
          </button>
        )}
      </div>

      {!isPaused && confirmPause ? (
        <p className="mt-3 text-xs text-amber-900">{t("pauseConfirmHint")}</p>
      ) : null}
    </section>
  );
}
