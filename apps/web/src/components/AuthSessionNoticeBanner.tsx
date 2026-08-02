"use client";

import { useAuthSession } from "@/hooks/use-auth-session";

export function AuthSessionNoticeBanner() {
  const { sessionNotice, clearSessionNotice } = useAuthSession();

  if (!sessionNotice) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
      <span>{sessionNotice}</span>{" "}
      <button
        type="button"
        onClick={clearSessionNotice}
        className="font-semibold text-rose-800 underline"
      >
        Dismiss
      </button>
    </div>
  );
}
