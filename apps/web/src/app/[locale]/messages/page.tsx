"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getSession } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import {
  listMessageConversations,
  previewText,
  type MessageConversation,
} from "@/lib/messages";
import { resolveMemberDisplayName, resolveMemberDistrict } from "@/lib/member-display";
import { useMemberDropdowns } from "@/hooks/use-member-dropdowns";
import { PaidMembershipRequired } from "@/components/PaidMembershipRequired";
import { useAuthSession } from "@/hooks/use-auth-session";
import { membershipFromSession } from "@/lib/membership";
import { useRequireMember } from "@/hooks/use-require-member";

function formatPreview(body: string, max = 80) {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function formatWhen(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function MessagesPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const dropdowns = useMemberDropdowns();
  const { user: session, ready: sessionReady } = useAuthSession();
  const { isMember } = useRequireMember();
  const isPaid = membershipFromSession(session);
  const [conversations, setConversations] = useState<MessageConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [session, items] = await Promise.all([
        getSession(token),
        listMessageConversations(token),
      ]);
      if (!session.termsAccepted) {
        router.replace("/profile");
        return;
      }

      setConversations(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [router, t]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  useEffect(() => {
    if (!mounted || !authToken) return;
    const interval = window.setInterval(() => {
      void load({ silent: true });
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [mounted, authToken, load]);

  if (!mounted || !isMember || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (!authToken) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{t("signInRequired")}</p>
      </main>
    );
  }

  if (sessionReady && !isPaid) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="mt-2 text-zinc-600">{t("subtitle")}</p>
        </div>
        <PaidMembershipRequired feature="messages" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="mt-2 text-zinc-600">{t("subtitle")}</p>
        <Link
          href="/video-calls"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-900 hover:bg-rose-100"
        >
          <span aria-hidden>📹</span>
          {t("videoCallsHub")}
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-zinc-600">{t("empty")}</p>
          <Link
            href="/connections"
            className="mt-4 inline-flex rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
          >
            {t("viewConnections")}
          </Link>
        </div>
      ) : (
        <>
          {conversations.some((c) => !c.lastMessage) ? (
            <p className="mb-4 rounded-lg bg-rose-50/80 px-4 py-3 text-sm text-rose-900">
              {t("inboxHint")}
            </p>
          ) : null}
          <ul className="space-y-3">
            {conversations.map((conversation) => {
              const name = resolveMemberDisplayName(conversation.member, {
                profileRef: (code) => t("profileRef", { code }),
                anonymous: t("unknownMember"),
              });
              const last = conversation.lastMessage;
              const hasStarted = Boolean(last);
              const previewBody = last
                ? last.isDeleted
                  ? t("messageDeleted")
                  : previewText(last)
                : "";
              const preview = last
                ? last.isMine
                  ? t("youPrefix", { text: formatPreview(previewBody) })
                  : formatPreview(previewBody)
                : t("clickToStartChat");
              const unread = conversation.unreadCount > 0;
              const districtLabel = resolveMemberDistrict(
                conversation.member.currentDistrict,
                dropdowns,
              );

              return (
                <li key={conversation.connectionId}>
                  <Link
                    href={`/messages/${conversation.connectionId}`}
                    className={`group flex items-center gap-4 rounded-2xl border border-l-4 px-4 py-4 transition-all ${
                      unread
                        ? "border-rose-300 border-l-rose-700 bg-rose-50 hover:border-rose-400 hover:bg-rose-50/90 hover:shadow-md"
                        : hasStarted
                          ? "border-rose-200 border-l-rose-500 bg-white hover:border-rose-300 hover:bg-rose-50/30 hover:shadow-md"
                          : "border-rose-300 border-l-amber-500 bg-gradient-to-br from-rose-50 via-white to-amber-50/40 hover:border-rose-400 hover:shadow-md"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${
                        unread
                          ? "bg-rose-800 text-white"
                          : hasStarted
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                      aria-hidden
                    >
                      💬
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p
                          className={`truncate font-semibold ${
                            unread ? "text-zinc-950" : "text-zinc-900"
                          }`}
                        >
                          {name}
                        </p>
                        <time
                          className="shrink-0 text-xs text-zinc-500"
                          dateTime={conversation.updatedAt}
                        >
                          {formatWhen(conversation.updatedAt, locale)}
                        </time>
                      </div>
                      {districtLabel ? (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {districtLabel}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p
                          className={`min-w-0 truncate text-sm ${
                            hasStarted
                              ? unread
                                ? "font-medium text-zinc-800"
                                : "text-zinc-600"
                              : "font-medium text-rose-800"
                          }`}
                        >
                          {preview}
                        </p>
                        {unread ? (
                          <span className="inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-rose-800 px-1.5 py-0.5 text-[11px] font-bold text-white">
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs font-semibold text-rose-800 group-hover:underline">
                            {hasStarted ? t("openChat") : t("clickToStartChat")} →
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
