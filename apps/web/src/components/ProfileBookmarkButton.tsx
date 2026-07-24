"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  removeProfileBookmark,
  saveProfileBookmark,
} from "@/lib/discovery";

type ProfileBookmarkButtonProps = {
  profileId: string;
  profileCode: string;
  isBookmarked: boolean;
  onChange?: (bookmarked: boolean) => void;
  compact?: boolean;
};

export function ProfileBookmarkButton({
  profileId,
  profileCode,
  isBookmarked: initialBookmarked,
  onChange,
  compact = false,
}: ProfileBookmarkButtonProps) {
  const t = useTranslations("savedProfiles");
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  async function toggleBookmark() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setLoading(true);
    try {
      if (isBookmarked) {
        await removeProfileBookmark(token, profileCode || profileId);
        setIsBookmarked(false);
        onChange?.(false);
      } else {
        await saveProfileBookmark(token, profileCode || profileId);
        setIsBookmarked(true);
        onChange?.(true);
      }
    } catch {
      /* keep prior state */
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void toggleBookmark()}
      aria-pressed={isBookmarked}
      aria-label={isBookmarked ? t("removeBookmark") : t("saveBookmark")}
      className={
        compact
          ? "rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          : "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
      }
    >
      {isBookmarked ? t("saved") : t("save")}
    </button>
  );
}
