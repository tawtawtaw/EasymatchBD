"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AUTH_TOKEN_KEY, getMe } from "@/lib/api";
import {
  approveProfileDeletionRequest,
  cancelProfileDeletionRequest,
  listProfileDeletionRequests,
  rejectProfileDeletionRequest,
  type ProfileDeletionRequestItem,
} from "@/lib/admin-profile-deletions";

type AdminProfileDeletionsPanelProps = {
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
};

function display(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

function actorLabel(actor: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
}) {
  return (
    actor.fullName?.trim() ||
    actor.email?.trim() ||
    actor.phone?.trim() ||
    "—"
  );
}

export function AdminProfileDeletionsPanel({
  onError,
  onMessage,
}: AdminProfileDeletionsPanelProps) {
  const t = useTranslations("admin.deletions");
  const tc = useTranslations("common");
  const [items, setItems] = useState<ProfileDeletionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setLoading(true);
    onError(null);
    try {
      const [me, pending] = await Promise.all([
        getMe(token),
        listProfileDeletionRequests(token, "pending"),
      ]);
      setCurrentUserId(me.id);
      setItems(pending);
    } catch (err) {
      onError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }, [onError, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(requestId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(requestId);
    onError(null);
    onMessage(null);
    try {
      await approveProfileDeletionRequest(token, requestId);
      onMessage(t("actions.approved"));
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(null);
    }
  }

  async function handleReject(requestId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(requestId);
    onError(null);
    onMessage(null);
    try {
      await rejectProfileDeletionRequest(token, requestId, rejectNote.trim());
      setRejectingId(null);
      setRejectNote("");
      onMessage(t("actions.rejected"));
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(null);
    }
  }

  async function handleCancel(requestId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(requestId);
    onError(null);
    onMessage(null);
    try {
      await cancelProfileDeletionRequest(token, requestId);
      onMessage(t("actions.cancelled"));
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(null);
    }
  }

  const pendingCount = items.length;

  return (
    <section className="rounded-2xl border border-zinc-300 bg-white p-4 shadow-md sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">{t("title")}</h2>
          <p className="text-sm text-zinc-600">{t("hint")}</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
          {t("pendingCount", { count: pendingCount })}
        </span>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-600">{tc("loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">{t("empty")}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => {
            const isRequester = currentUserId === item.requestedBy.id;
            const canReview = !isRequester;

            return (
              <li
                key={item.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {display(item.target.fullName) || t("unnamed")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {t(`kind.${item.targetKind}`)}
                      {item.target.profileCode
                        ? ` · ${t("profileCode", { code: item.target.profileCode })}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {t("requestedBy", {
                        name: actorLabel(item.requestedBy),
                      })}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {t("requestedAt", {
                        date: new Date(item.requestedAt).toLocaleString(),
                      })}
                    </p>
                    {item.reason ? (
                      <p className="mt-2 text-sm text-zinc-700">
                        {t("reason", { text: item.reason })}
                      </p>
                    ) : null}
                  </div>
                </div>

                {isRequester ? (
                  <p className="mt-3 text-xs font-medium text-amber-800">
                    {t("awaitingOtherAdmin")}
                  </p>
                ) : (
                  <p className="mt-3 text-xs font-medium text-blue-800">
                    {t("youCanReview")}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {isRequester ? (
                    <button
                      type="button"
                      disabled={acting === item.id}
                      onClick={() => void handleCancel(item.id)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
                    >
                      {t("cancelRequest")}
                    </button>
                  ) : null}
                  {canReview ? (
                    <>
                      <button
                        type="button"
                        disabled={acting === item.id}
                        onClick={() => void handleApprove(item.id)}
                        className="rounded-lg bg-rose-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                      >
                        {t("approve")}
                      </button>
                      <button
                        type="button"
                        disabled={acting === item.id}
                        onClick={() =>
                          setRejectingId((current) =>
                            current === item.id ? null : item.id,
                          )
                        }
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
                      >
                        {t("reject")}
                      </button>
                    </>
                  ) : null}
                </div>

                {rejectingId === item.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder={t("rejectNotePlaceholder")}
                      className="field-input min-h-[80px] w-full"
                    />
                    <button
                      type="button"
                      disabled={acting === item.id}
                      onClick={() => void handleReject(item.id)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
                    >
                      {t("confirmReject")}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
