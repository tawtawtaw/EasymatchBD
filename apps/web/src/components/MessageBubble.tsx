"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  canDeleteConnectionMessage,
  canEditConnectionMessage,
  canManageConnectionMessage,
} from "@easymatch/shared";
import {
  deleteConnectionMessage,
  fetchMessageAttachmentBlob,
  updateConnectionMessage,
  type MessageItem,
} from "@/lib/messages";

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

function canEdit(message: MessageItem) {
  return canEditConnectionMessage({
    isMine: message.isMine,
    isDeleted: message.isDeleted,
    messageType: message.messageType,
    createdAt: message.createdAt,
    deliveryStatus: message.deliveryStatus,
  });
}

function canDelete(message: MessageItem) {
  return canDeleteConnectionMessage({
    isMine: message.isMine,
    isDeleted: message.isDeleted,
    deliveryStatus: message.deliveryStatus,
  });
}

function canManage(message: MessageItem) {
  return canManageConnectionMessage({
    isMine: message.isMine,
    isDeleted: message.isDeleted,
    messageType: message.messageType,
    createdAt: message.createdAt,
    deliveryStatus: message.deliveryStatus,
  });
}

type MessageBubbleProps = {
  message: MessageItem;
  connectionId: string;
  token: string;
  onUpdated: (message: MessageItem) => void;
};

function MessageAttachment({
  message,
  connectionId,
  token,
}: {
  message: MessageItem;
  connectionId: string;
  token: string;
}) {
  const t = useTranslations("messages");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    void fetchMessageAttachmentBlob(token, connectionId, message.id)
      .then(({ blob }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [connectionId, message.id, token]);

  if (error) {
    return (
      <p className="text-xs opacity-80">{t("attachmentUnavailable")}</p>
    );
  }

  if (!blobUrl) {
    return <p className="text-xs opacity-80">{t("loadingAttachment")}</p>;
  }

  if (message.messageType === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={blobUrl}
        alt={message.attachment?.fileName ?? t("imageAttachment")}
        className="mt-1 max-h-48 rounded-lg object-cover"
      />
    );
  }

  return (
    <a
      href={blobUrl}
      download={message.attachment?.fileName ?? "attachment"}
      className="mt-1 inline-flex text-sm font-medium underline"
    >
      📎 {message.attachment?.fileName ?? t("fileAttachment")}
    </a>
  );
}

export function MessageBubble({
  message,
  connectionId,
  token,
  onUpdated,
}: MessageBubbleProps) {
  const locale = useLocale();
  const t = useTranslations("messages");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.body ?? "");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  async function saveEdit() {
    const body = editDraft.trim();
    if (!body) return;
    setBusy(true);
    try {
      const updated = await updateConnectionMessage(
        token,
        connectionId,
        message.id,
        body,
      );
      onUpdated(updated);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      const updated = await deleteConnectionMessage(
        token,
        connectionId,
        message.id,
      );
      onUpdated(updated);
      setMenuOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    message.deliveryStatus === "read"
      ? t("statusRead")
      : message.deliveryStatus === "delivered"
        ? t("statusDelivered")
        : null;

  return (
    <div
      className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`relative max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
          message.isMine
            ? "bg-rose-800 text-white"
            : "bg-zinc-100 text-zinc-900"
        }`}
      >
        {message.isMine && !message.isDeleted && canManage(message) ? (
          <div className="absolute -left-2 top-2" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full bg-white/90 px-1.5 py-0.5 text-xs text-zinc-600 shadow"
              aria-label={t("messageActions")}
            >
              ⋮
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-10 mt-1 min-w-[7rem] rounded-lg border border-zinc-200 bg-white py-1 text-zinc-800 shadow-lg">
                {canEdit(message) ? (
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-50"
                    onClick={() => {
                      setEditDraft(message.body ?? "");
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    {t("edit")}
                  </button>
                ) : null}
                {canDelete(message) ? (
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-xs text-red-700 hover:bg-red-50"
                    onClick={() => void remove()}
                    disabled={busy}
                  >
                    {t("delete")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {message.isDeleted ? (
          <p className="italic opacity-80">{t("messageDeleted")}</p>
        ) : editing ? (
          <div className="space-y-2">
            <textarea
              value={editDraft}
              onChange={(event) => setEditDraft(event.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-900"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={busy || !editDraft.trim()}
                className="rounded bg-white/20 px-2 py-1 text-xs font-semibold"
              >
                {t("saveEdit")}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded px-2 py-1 text-xs"
              >
                {t("cancelEdit")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {message.attachment ? (
              <MessageAttachment
                message={message}
                connectionId={connectionId}
                token={token}
              />
            ) : null}
            {message.body ? (
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
            ) : null}
          </>
        )}

        <div
          className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0 text-[11px] ${
            message.isMine ? "text-rose-100" : "text-zinc-500"
          }`}
        >
          <time dateTime={message.createdAt}>
            {formatWhen(message.createdAt, locale)}
          </time>
          {message.isEdited && !message.isDeleted ? (
            <span>{t("edited")}</span>
          ) : null}
          {message.isMine && statusLabel ? <span>{statusLabel}</span> : null}
        </div>
      </div>
    </div>
  );
}
