"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useMounted } from "@/hooks/use-mounted";

type VerificationRejectDialogProps = {
  title: string;
  hint: string;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: (officerMessage: string) => void;
};

export function VerificationRejectDialog({
  title,
  hint,
  submitting = false,
  onCancel,
  onConfirm,
}: VerificationRejectDialogProps) {
  const t = useTranslations("verification.rejectDialog");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) {
      setError(t("required"));
      return;
    }
    onConfirm(trimmed);
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-reject-title"
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
      >
        <header className="border-b border-zinc-200 px-4 py-4 sm:px-5">
          <h2 id="verification-reject-title" className="text-lg font-bold text-zinc-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{hint}</p>
        </header>

        <div className="space-y-3 px-4 py-4 sm:px-5">
          <label className="block text-sm font-medium text-zinc-800">
            {t("label")}
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setError(null);
              }}
              rows={6}
              maxLength={2000}
              placeholder={t("placeholder")}
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-rose-700/20 focus:border-rose-700 focus:ring-2"
            />
          </label>
          <p className="text-xs text-zinc-500">{t("memberHint")}</p>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {tc("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {submitting ? tc("loading") : t("confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
