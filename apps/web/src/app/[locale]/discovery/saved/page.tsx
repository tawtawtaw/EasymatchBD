"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { DiscoveryProfileCard } from "@/components/DiscoveryProfileCard";
import { AUTH_TOKEN_KEY, getSession } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import { useRequireMember } from "@/hooks/use-require-member";
import {
  listSavedProfiles,
  removeProfileBookmark,
  type SavedProfileItem,
} from "@/lib/discovery";

function formatWhen(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function SavedProfilesPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("savedProfiles");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const { isMember } = useRequireMember();
  const [items, setItems] = useState<SavedProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await getSession(token);
      if (!session.termsAccepted) {
        router.replace("/profile");
        return;
      }

      const saved = await listSavedProfiles(token);
      setItems(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  async function handleRemove(profileCode: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(profileCode);
    setError(null);
    try {
      await removeProfileBookmark(token, profileCode);
      setItems((current) =>
        current.filter((item) => item.profileCode !== profileCode),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(null);
    }
  }

  if (!mounted || !isMember || loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (!authToken) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{t("signInRequired")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/discovery"
            className="text-sm font-medium text-rose-800 hover:underline"
          >
            {t("backToDiscovery")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="mt-2 text-zinc-600">{t("subtitle")}</p>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-zinc-600">{t("empty")}</p>
          <Link
            href="/discovery"
            className="mt-4 inline-flex rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
          >
            {t("browseDiscovery")}
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <li key={item.bookmarkId} className="flex flex-col gap-2">
              <DiscoveryProfileCard token={authToken} item={item} />
              <div className="flex items-center justify-between px-1 text-xs text-zinc-500">
                <span>
                  {t("savedOn", {
                    date: formatWhen(item.savedAt, locale),
                  })}
                </span>
                <button
                  type="button"
                  disabled={acting === item.profileCode}
                  onClick={() => void handleRemove(item.profileCode)}
                  className="font-medium text-rose-800 hover:text-rose-900 disabled:opacity-60"
                >
                  {t("remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
