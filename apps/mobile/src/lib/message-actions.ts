import {
  canDeleteConnectionMessage,
  canEditConnectionMessage,
  canManageConnectionMessage,
  MESSAGE_EDIT_WINDOW_MS,
} from "@easymatch/shared";
import type { MessageItem } from "../types/messages";

export { MESSAGE_EDIT_WINDOW_MS };

export function canEditMessage(message: MessageItem) {
  return canEditConnectionMessage({
    isMine: message.isMine,
    isDeleted: message.isDeleted,
    messageType: message.messageType,
    createdAt: message.createdAt,
    deliveryStatus: message.deliveryStatus,
  });
}

export function canDeleteMessage(message: MessageItem) {
  return canDeleteConnectionMessage({
    isMine: message.isMine,
    isDeleted: message.isDeleted,
    deliveryStatus: message.deliveryStatus,
  });
}

export function canManageMessage(message: MessageItem) {
  return canManageConnectionMessage({
    isMine: message.isMine,
    isDeleted: message.isDeleted,
    messageType: message.messageType,
    createdAt: message.createdAt,
    deliveryStatus: message.deliveryStatus,
  });
}
