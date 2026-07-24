import type { MessageItem } from "../types/messages";

export function messagePreviewText(message: MessageItem | null) {
  if (!message) return "";
  if (message.isDeleted) return "";
  if (message.messageType === "image") {
    return message.body?.trim() || "Photo";
  }
  if (message.messageType === "file") {
    return message.body?.trim() || "Attachment";
  }
  return message.body ?? "";
}

export function formatMessageTime(iso: string, locale = "en") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
