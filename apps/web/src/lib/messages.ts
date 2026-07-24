import { EASYMATCH_API_URL } from "@easymatch/shared";
import { dedupeRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

function apiUrl(): string {
  return typeof window !== "undefined" ? getApiBaseUrl() : API_URL;
}

async function parseResponse<T>(res: Response): Promise<T> {
  return readJsonResponse<T>(res);
}

function authHeaders(token: string, json = true) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (json) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export type MessageMember = {
  userId: string;
  profileId: string | null;
  profileCode: string | null;
  fullName: string | null;
  currentDistrict: string | null;
  isVerified: boolean;
  isPaused?: boolean;
};

export type MessageDeliveryStatus = "delivered" | "read";

export type MessageAttachmentMeta = {
  fileName: string | null;
  mimeType: string | null;
  hasFile: boolean;
};

export type MessageItem = {
  id: string;
  senderId: string;
  messageType: "text" | "image" | "file";
  body: string | null;
  isMine: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  deliveryStatus: MessageDeliveryStatus | null;
  attachment: MessageAttachmentMeta | null;
  createdAt: string;
  editedAt: string | null;
};

export type MessagePreview = MessageItem;

export type MessageConversation = {
  connectionId: string;
  member: MessageMember;
  lastMessage: MessagePreview | null;
  unreadCount: number;
  lastReadAt: string | null;
  updatedAt: string;
};

export type MessageThread = {
  connectionId: string;
  member: MessageMember;
  messages: MessageItem[];
  hasMore: boolean;
  partnerLastReadAt: string | null;
  myLastReadAt: string | null;
  partnerTyping: boolean;
  partnerIsPaused?: boolean;
  viewerIsPaused?: boolean;
};

export async function getMessageUnreadCount(token: string) {
  return dedupeRequest(
    "message-unread-count",
    async () => {
      const res = await apiFetch(`${apiUrl()}/discovery/messages/unread-count`, {
        headers: authHeaders(token),
      });
      return parseResponse<{ unreadCount: number }>(res);
    },
    10_000,
  );
}

export async function listMessageConversations(
  token: string,
): Promise<MessageConversation[]> {
  return dedupeRequest(
    "message-conversations",
    async () => {
      const res = await apiFetch(`${apiUrl()}/discovery/messages`, {
        headers: authHeaders(token),
      });
      return parseResponse<MessageConversation[]>(res);
    },
    10_000,
  );
}

export async function listConnectionMessages(
  token: string,
  connectionId: string,
  options?: {
    limit?: number;
    before?: string;
    since?: string;
    markRead?: boolean;
  },
): Promise<MessageThread> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.before) params.set("before", options.before);
  if (options?.since) params.set("since", options.since);
  if (options?.markRead === false) params.set("markRead", "false");
  const query = params.toString();
  const cacheKey = `messages:${connectionId}:${query || "default"}`;
  const useDedupe = options?.markRead === false || Boolean(options?.since);

  const loader = async () => {
    const res = await apiFetch(
      `${apiUrl()}/discovery/messages/${connectionId}${query ? `?${query}` : ""}`,
      { headers: authHeaders(token) },
    );
    return parseResponse<MessageThread>(res);
  };

  if (useDedupe) {
    return dedupeRequest(cacheKey, loader, 3_000);
  }
  return loader();
}

export async function markConnectionMessagesRead(
  token: string,
  connectionId: string,
) {
  const res = await apiFetch(`${apiUrl()}/discovery/messages/${connectionId}/read`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<{ lastReadAt: string }>(res);
}

export async function setConnectionTyping(token: string, connectionId: string) {
  const res = await apiFetch(`${apiUrl()}/discovery/messages/${connectionId}/typing`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<{ ok: boolean }>(res);
}

export async function sendConnectionMessage(
  token: string,
  connectionId: string,
  body: string,
): Promise<MessageItem> {
  const res = await apiFetch(`${apiUrl()}/discovery/messages/${connectionId}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ body }),
  });
  return parseResponse<MessageItem>(res);
}

export async function sendConnectionAttachment(
  token: string,
  connectionId: string,
  file: File,
  caption?: string,
): Promise<MessageItem> {
  const form = new FormData();
  form.append("file", file);
  if (caption?.trim()) {
    form.append("caption", caption.trim());
  }
  const res = await apiFetch(
    `${apiUrl()}/discovery/messages/${connectionId}/attachments`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  return parseResponse<MessageItem>(res);
}

export async function updateConnectionMessage(
  token: string,
  connectionId: string,
  messageId: string,
  body: string,
): Promise<MessageItem> {
  const res = await apiFetch(
    `${apiUrl()}/discovery/messages/${connectionId}/${messageId}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ body }),
    },
  );
  return parseResponse<MessageItem>(res);
}

export async function deleteConnectionMessage(
  token: string,
  connectionId: string,
  messageId: string,
): Promise<MessageItem> {
  const res = await apiFetch(
    `${apiUrl()}/discovery/messages/${connectionId}/${messageId}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    },
  );
  return parseResponse<MessageItem>(res);
}

export function messageAttachmentUrl(
  connectionId: string,
  messageId: string,
) {
  return `${apiUrl()}/discovery/messages/${connectionId}/${messageId}/attachment`;
}

export async function fetchMessageAttachmentBlob(
  token: string,
  connectionId: string,
  messageId: string,
) {
  const res = await apiFetch(messageAttachmentUrl(connectionId, messageId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Could not load attachment");
  }
  const blob = await res.blob();
  return {
    blob,
    mimeType: res.headers.get("content-type"),
  };
}

export function previewText(message: MessageItem | MessagePreview | null) {
  if (!message) return "";
  if (message.isDeleted) return "";
  if (message.messageType === "image") {
    return message.body?.trim() || "📷";
  }
  if (message.messageType === "file") {
    return message.body?.trim() || "📎";
  }
  return message.body ?? "";
}
