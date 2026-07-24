export type MessageMember = {
  userId: string;
  profileId: string | null;
  profileCode: string | null;
  fullName: string | null;
  currentDistrict: string | null;
  isVerified: boolean;
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

export type MessageConversation = {
  connectionId: string;
  member: MessageMember;
  lastMessage: MessageItem | null;
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
  viewerIsPaused?: boolean;
  partnerIsPaused?: boolean;
};
