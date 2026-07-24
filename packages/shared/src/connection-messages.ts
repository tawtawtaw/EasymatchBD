export const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

export function isConnectionMessageReadByPartner(
  createdAt: Date | string,
  partnerLastReadAt: Date | string | null | undefined,
): boolean {
  if (!partnerLastReadAt) return false;
  const created =
    typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const readAt =
    typeof partnerLastReadAt === 'string'
      ? new Date(partnerLastReadAt)
      : partnerLastReadAt;
  if (Number.isNaN(created.getTime()) || Number.isNaN(readAt.getTime())) {
    return false;
  }
  return readAt.getTime() >= created.getTime();
}

export type ConnectionMessageDeliveryStatus = 'read' | 'delivered' | null;

export type ConnectionMessageActionInput = {
  isMine: boolean;
  isDeleted: boolean;
  messageType: 'text' | 'image' | 'file';
  createdAt: string;
  deliveryStatus: ConnectionMessageDeliveryStatus;
};

/** Text messages only, within 15 minutes, and not yet read by the other member. */
export function canEditConnectionMessage(
  message: ConnectionMessageActionInput,
): boolean {
  if (!message.isMine || message.isDeleted || message.messageType !== 'text') {
    return false;
  }
  if (message.deliveryStatus === 'read') {
    return false;
  }
  return (
    Date.now() - new Date(message.createdAt).getTime() <=
    MESSAGE_EDIT_WINDOW_MS
  );
}

/** Own messages only, not yet read by the other member. */
export function canDeleteConnectionMessage(
  message: Pick<
    ConnectionMessageActionInput,
    'isMine' | 'isDeleted' | 'deliveryStatus'
  >,
): boolean {
  if (!message.isMine || message.isDeleted) {
    return false;
  }
  return message.deliveryStatus !== 'read';
}

export function canManageConnectionMessage(
  message: ConnectionMessageActionInput,
): boolean {
  return (
    canEditConnectionMessage(message) ||
    canDeleteConnectionMessage(message)
  );
}
