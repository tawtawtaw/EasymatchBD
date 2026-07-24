"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getSession } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import {
  listConnectionMessages,
  sendConnectionAttachment,
  sendConnectionMessage,
  setConnectionTyping,
  type MessageItem,
  type MessageMember,
} from "@/lib/messages";
import { listMyConnections } from "@/lib/discovery";
import { resolveMemberDisplayName, resolveMemberDistrict } from "@/lib/member-display";
import { memberComplaintHref } from "@/lib/member-complaints";
import { useMemberDropdowns } from "@/hooks/use-member-dropdowns";
import { VideoCallPanel } from "@/components/VideoCallPanel";
import { ProfilePausedBanner } from "@/components/ProfilePausedBanner";
import { MessageBubble } from "@/components/MessageBubble";
import { PaidMembershipRequired } from "@/components/PaidMembershipRequired";
import { useAuthSession } from "@/hooks/use-auth-session";
import { membershipFromSession } from "@/lib/membership";
import { useRequireMember } from "@/hooks/use-require-member";

function memberProfileRef(member: MessageMember) {
  return member.profileCode ?? member.profileId ?? "";
}

export default function MessageThreadPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const router = useRouter();
  const t = useTranslations("messages");
  const tAccount = useTranslations("profile.accountStatus");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const dropdowns = useMemberDropdowns();
  const { user: session, ready: sessionReady } = useAuthSession();
  const { isMember } = useRequireMember();
  const isPaid = membershipFromSession(session);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [member, setMember] = useState<MessageMember | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerIsPaused, setPartnerIsPaused] = useState(false);
  const [viewerIsPaused, setViewerIsPaused] = useState(false);
  const [draft, setDraft] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingSentAtRef = useRef(0);
  const initialScrollRef = useRef(true);

  useEffect(() => {
    void params.then((value) => setConnectionId(value.connectionId));
  }, [params]);

  const refreshInFlightRef = useRef(false);
  const lastMessageAtRef = useRef<string | null>(null);

  const refreshThread = useCallback(
    async (options?: { silent?: boolean; markRead?: boolean }) => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !connectionId) return;

      if (refreshInFlightRef.current) {
        return;
      }

      refreshInFlightRef.current = true;

      if (!options?.silent) {
        setError(null);
      }

      try {
        const silent = options?.silent ?? false;
        const since =
          silent && lastMessageAtRef.current ? lastMessageAtRef.current : undefined;
        const thread = await listConnectionMessages(token, connectionId, {
          markRead: options?.markRead ?? !silent,
          since,
          limit: since ? 30 : undefined,
        });
        if (since && thread.messages.length > 0) {
          setMessages((current) => {
            const known = new Set(current.map((item) => item.id));
            const merged = [...current];
            for (const message of thread.messages) {
              if (!known.has(message.id)) {
                merged.push(message);
              }
            }
            return merged;
          });
        } else if (!since) {
          setMember(thread.member);
          setMessages(thread.messages);
          setHasMore(thread.hasMore);
        }
        setPartnerTyping(thread.partnerTyping);
        setPartnerIsPaused(Boolean(thread.partnerIsPaused));
        setViewerIsPaused(Boolean(thread.viewerIsPaused));
        if (thread.messages.length > 0) {
          lastMessageAtRef.current =
            thread.messages[thread.messages.length - 1]?.createdAt ?? null;
        }
      } catch (err) {
        if (!options?.silent) {
          setError(err instanceof Error ? err.message : t("actions.error"));
        }
      } finally {
        refreshInFlightRef.current = false;
      }
    },
    [connectionId, t],
  );

  const loadInitial = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !connectionId) return;

    setError(null);
    try {
      const [session, thread, connections] = await Promise.all([
        getSession(token),
        listConnectionMessages(token, connectionId),
        listMyConnections(token),
      ]);
      if (!session.termsAccepted) {
        router.replace("/profile");
        return;
      }

      const connection = connections.find(
        (item) => item.connectionId === connectionId,
      );
      setPrivacyLevel(connection?.privacyLevel ?? 1);
      setMember(thread.member);
      setMessages(thread.messages);
      setHasMore(thread.hasMore);
      setPartnerTyping(thread.partnerTyping);
      setPartnerIsPaused(Boolean(thread.partnerIsPaused ?? thread.member.isPaused));
      setViewerIsPaused(Boolean(thread.viewerIsPaused ?? session.isPaused));
      if (thread.messages.length > 0) {
        lastMessageAtRef.current =
          thread.messages[thread.messages.length - 1]?.createdAt ?? null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }, [connectionId, router, t]);

  useEffect(() => {
    if (!mounted || !connectionId) return;
    void loadInitial();
  }, [mounted, connectionId, loadInitial]);

  useEffect(() => {
    if (!mounted || !connectionId || !authToken) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refreshThread({ silent: true, markRead: false });
    }, 12_000);
    return () => window.clearInterval(interval);
  }, [mounted, connectionId, authToken, refreshThread]);

  useEffect(() => {
    if (initialScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      initialScrollRef.current = false;
    }
  }, [messages]);

  function updateMessage(updated: MessageItem) {
    setMessages((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  async function loadOlder() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !connectionId || !messages.length || loadingMore) return;

    setLoadingMore(true);
    try {
      const older = await listConnectionMessages(token, connectionId, {
        before: messages[0]?.createdAt,
        markRead: false,
      });
      setMessages((current) => [...older.messages, ...current]);
      setHasMore(older.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoadingMore(false);
    }
  }

  function notifyTyping() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !connectionId) return;
    const now = Date.now();
    if (now - typingSentAtRef.current < 2500) return;
    typingSentAtRef.current = now;
    void setConnectionTyping(token, connectionId);
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !connectionId) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    setError(null);
    try {
      const sent = await sendConnectionMessage(token, connectionId, body);
      setMessages((current) => [...current, sent]);
      setDraft("");
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setSending(false);
    }
  }

  async function handleAttachment(event: ChangeEvent<HTMLInputElement>) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!token || !connectionId || !file) return;

    setSending(true);
    setError(null);
    try {
      const sent = await sendConnectionAttachment(
        token,
        connectionId,
        file,
        draft.trim() || undefined,
      );
      setMessages((current) => [...current, sent]);
      setDraft("");
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setSending(false);
    }
  }

  if (!mounted || !isMember || !connectionId || loading) {
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
        <PaidMembershipRequired feature="messages" />
      </main>
    );
  }

  const name = member
    ? resolveMemberDisplayName(member, {
        profileRef: (code) => t("profileRef", { code }),
        anonymous: t("unknownMember"),
      })
    : t("unknownMember");
  const profileRef = member ? memberProfileRef(member) : "";
  const districtLabel = resolveMemberDistrict(member?.currentDistrict, dropdowns);

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/messages"
            className="text-sm font-medium text-rose-800 hover:text-rose-900"
          >
            {t("backToInbox")}
          </Link>
          <h1 className="mt-2 text-xl font-bold text-zinc-900">{name}</h1>
          {districtLabel ? (
            <p className="text-sm text-zinc-500">{districtLabel}</p>
          ) : null}
          {partnerTyping ? (
            <p className="mt-1 text-xs text-emerald-700">{t("typing")}</p>
          ) : null}
        </div>
        {profileRef ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/discovery/${profileRef}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {t("viewProfile")}
            </Link>
            <Link
              href={memberComplaintHref(profileRef)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {t("fileComplaint")}
            </Link>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {viewerIsPaused ? <ProfilePausedBanner className="mb-4" /> : null}

      {!viewerIsPaused && partnerIsPaused ? (
        <div
          className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800"
          role="status"
        >
          <p className="font-semibold">{tAccount("partnerPausedTitle")}</p>
          <p className="mt-1">{tAccount("partnerPausedBody")}</p>
        </div>
      ) : null}

      <VideoCallPanel
        connectionId={connectionId}
        privacyLevel={privacyLevel}
        memberName={name}
      />

      <div className="flex min-h-[24rem] flex-1 flex-col overflow-hidden rounded-xl bg-zinc-50/50">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {hasMore ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => void loadOlder()}
                disabled={loadingMore}
                className="text-sm font-medium text-rose-800 hover:text-rose-900 disabled:opacity-60"
              >
                {loadingMore ? t("loadingOlder") : t("loadOlder")}
              </button>
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="flex min-h-[16rem] flex-col items-center justify-center px-4 text-center">
              <span
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-xl"
                aria-hidden
              >
                💬
              </span>
              <p className="text-base font-semibold text-zinc-900">
                {t("noMessagesYet")}
              </p>
              <p className="mt-2 max-w-sm text-sm text-zinc-600">
                {t("clickToStartChat")}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                connectionId={connectionId}
                token={authToken}
                onUpdated={updateMessage}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(event) => void handleSend(event)}
          className="border-t border-zinc-200/80 bg-white p-4"
        >
          {viewerIsPaused ? (
            <p className="text-sm text-zinc-600">{tAccount("pausedBannerBody")}</p>
          ) : (
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(event) => void handleAttachment(event)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="self-end rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              title={t("attachFile")}
            >
              📎
            </button>
            <textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                notifyTyping();
              }}
              placeholder={t("inputPlaceholder")}
              rows={2}
              maxLength={2000}
              className="min-h-[3rem] flex-1 resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-rose-700"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="self-end rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
            >
              {sending ? t("sending") : t("send")}
            </button>
          </div>
          )}
          {!viewerIsPaused ? (
            <p className="mt-2 text-xs text-zinc-500">{t("attachmentHint")}</p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
