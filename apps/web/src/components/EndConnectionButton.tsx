"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { endConnection } from "@/lib/discovery";

type EndConnectionButtonProps = {
  connectionId: string;
  privacyLevel: number;
  disabled?: boolean;
  onEnded?: () => void | Promise<void>;
};

export function EndConnectionButton({
  connectionId,
  privacyLevel,
  disabled = false,
  onEnded,
}: EndConnectionButtonProps) {
  const t = useTranslations("connections");
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleConfirm() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setConfirming(true);
    setError(null);
    try {
      await endConnection(token, connectionId);
      setOpen(false);
      await onEnded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("endError"));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || confirming}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
      >
        {t("endButton")}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[300] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-connection-title"
            className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
          >
            <h2
              id="end-connection-title"
              className="text-lg font-semibold text-zinc-900"
            >
              {t("endTitle")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">{t("endBody")}</p>
            {privacyLevel >= 3 ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {t("endFamilyNote")}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={confirming}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
              >
                {t("endKeep")}
              </button>
              <button
                type="button"
                disabled={confirming}
                onClick={() => void handleConfirm()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {t("endConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
