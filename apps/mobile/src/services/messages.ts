import { API_BASE_URL, apiRequest, apiUpload } from "./api/client";
import { dedupeRequest } from "./api/dedupe";
import { cacheDirectory, downloadAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { sessionStorage } from "./session-storage";
import type {
  MessageConversation,
  MessageItem,
  MessageThread,
} from "../types/messages";

export async function getMessageUnreadCount() {
  return dedupeRequest(
    "message-unread-count",
    () => apiRequest<{ unreadCount: number }>("/discovery/messages/unread-count"),
    10_000,
  );
}

export async function listMessageConversations() {
  return dedupeRequest(
    "message-conversations",
    () => apiRequest<MessageConversation[]>("/discovery/messages"),
    10_000,
  );
}

export async function listConnectionMessages(
  connectionId: string,
  options?: { limit?: number; before?: string; since?: string; markRead?: boolean },
) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.before) params.set("before", options.before);
  if (options?.since) params.set("since", options.since);
  if (options?.markRead === false) params.set("markRead", "false");
  const query = params.toString();
  const cacheKey = `messages:${connectionId}:${query || "default"}`;
  const useDedupe = options?.markRead === false || Boolean(options?.since);
  const loader = () =>
    apiRequest<MessageThread>(
      `/discovery/messages/${encodeURIComponent(connectionId)}${query ? `?${query}` : ""}`,
    );
  if (useDedupe) {
    return dedupeRequest(cacheKey, loader, 3_000);
  }
  return loader();
}

export async function sendConnectionMessage(connectionId: string, body: string) {
  return apiRequest<MessageItem>(`/discovery/messages/${encodeURIComponent(connectionId)}`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function sendConnectionAttachment(
  connectionId: string,
  file: { uri: string; name: string; type: string },
  caption?: string,
) {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  if (caption?.trim()) {
    formData.append("caption", caption.trim());
  }
  return apiUpload<MessageItem>(
    `/discovery/messages/${encodeURIComponent(connectionId)}/attachments`,
    formData,
  );
}

export async function setConnectionTyping(connectionId: string) {
  return apiRequest<{ ok: boolean }>(
    `/discovery/messages/${encodeURIComponent(connectionId)}/typing`,
    { method: "POST" },
  );
}

export async function markConnectionMessagesRead(connectionId: string) {
  return apiRequest<{ lastReadAt: string }>(
    `/discovery/messages/${encodeURIComponent(connectionId)}/read`,
    { method: "POST" },
  );
}

export async function updateConnectionMessage(
  connectionId: string,
  messageId: string,
  body: string,
) {
  return apiRequest<MessageItem>(
    `/discovery/messages/${encodeURIComponent(connectionId)}/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ body }),
    },
  );
}

export async function deleteConnectionMessage(connectionId: string, messageId: string) {
  return apiRequest<MessageItem>(
    `/discovery/messages/${encodeURIComponent(connectionId)}/${encodeURIComponent(messageId)}`,
    { method: "DELETE" },
  );
}

export function messageAttachmentUrl(connectionId: string, messageId: string) {
  return `${API_BASE_URL}/discovery/messages/${encodeURIComponent(connectionId)}/${encodeURIComponent(messageId)}/attachment`;
}

export async function downloadMessageAttachment(
  connectionId: string,
  messageId: string,
  fileName: string,
) {
  const token = await sessionStorage.getAccessToken();
  if (!token) {
    throw new Error("Not signed in");
  }

  const safeName = fileName.replace(/[^\w.\-]/g, "_") || "attachment";
  const dest = `${cacheDirectory ?? ""}${Date.now()}-${safeName}`;
  const result = await downloadAsync(
    messageAttachmentUrl(connectionId, messageId),
    dest,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (result.status !== 200) {
    throw new Error("Could not download attachment");
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri);
  }

  return result.uri;
}
