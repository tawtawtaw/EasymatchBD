import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionMessageType, Prisma } from '@prisma/client';
import { resolveVisibleFullName, isConnectionMessageReadByPartner } from '@easymatch/shared';
import { invalidateAlertsSummaryCache } from './alerts-summary-cache';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import { SubscriptionAccessService } from '../subscriptions/subscription-access.service';
import { PushNotificationService, MEMBER_INCOMING_PUSH, PUSH_CHANNEL_MESSAGES } from '../push/push-notification.service';
import { ProfilePauseService } from '../profiles/profile-pause.service';

function isDatabaseUnreachableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === 'P1001' || code === 'P1002';
}

const memberProfileSelect = {
  id: true,
  profileCode: true,
  fullName: true,
  isVerified: true,
  isPaused: true,
  currentDistrict: true,
} as const;

const connectionMemberSelect = {
  id: true,
  isActive: true,
  profile: { select: memberProfileSelect },
} as const;

const messageSelect = {
  id: true,
  senderId: true,
  messageType: true,
  body: true,
  editedAt: true,
  deletedAt: true,
  attachmentStorageKey: true,
  attachmentMimeType: true,
  attachmentFileName: true,
  createdAt: true,
} as const;

const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;
const TYPING_TTL_SECONDS = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

type SerializedMember = {
  userId: string;
  profileId: string | null;
  profileCode: string | null;
  fullName: string | null;
  currentDistrict: string | null;
  isVerified: boolean;
};

type MessageThreadSincePayload = {
  connectionId: string;
  member: SerializedMember;
  messages: Array<Record<string, unknown>>;
  hasMore: boolean;
  partnerLastReadAt: string | null;
  myLastReadAt: string | null;
  partnerTyping: boolean;
};

type MessageRow = {
  id: string;
  senderId: string;
  messageType: ConnectionMessageType;
  body: string;
  editedAt: Date | null;
  deletedAt: Date | null;
  attachmentStorageKey: string | null;
  attachmentMimeType: string | null;
  attachmentFileName: string | null;
  createdAt: Date;
};

@Injectable()
export class MessagesService {
  private readonly unreadCountCache = new Map<
    string,
    { expiresAt: number; value: number }
  >();
  private readonly threadMetaCache = new Map<
    string,
    {
      expiresAt: number;
      value: {
        member: ReturnType<MessagesService['serializeMember']>;
        privacyLevel: number;
      };
    }
  >();
  private readonly conversationsCache = new Map<
    string,
    { expiresAt: number; value: Awaited<ReturnType<MessagesService['fetchConversations']>> }
  >();
  private readonly unreadCountInflight = new Map<
    string,
    Promise<{ unreadCount: number }>
  >();
  private readonly unreadCountRefreshing = new Set<string>();
  private readonly conversationsInflight = new Map<
    string,
    Promise<Awaited<ReturnType<MessagesService['fetchConversations']>>>
  >();
  private static readonly UNREAD_COUNT_CACHE_TTL_MS = 30_000;
  private static readonly UNREAD_COUNT_STALE_TTL_MS = 120_000;
  private static readonly THREAD_META_CACHE_TTL_MS = 120_000;
  private static readonly CONVERSATIONS_CACHE_TTL_MS = 15_000;
  private static readonly SINCE_POLL_CACHE_TTL_MS = 15_000;
  private readonly sincePollCache = new Map<
    string,
    { expiresAt: number; value: MessageThreadSincePayload }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly redis: RedisService,
    private readonly subscriptionAccess: SubscriptionAccessService,
    private readonly privacyFields: PrivacyFieldsService,
    private readonly pushNotifications: PushNotificationService,
    private readonly profilePause: ProfilePauseService,
  ) {}

  private async requirePaid(userId: string) {
    await this.subscriptionAccess.assertPaidMember(userId);
  }

  private async countUnreadByConnection(
    userId: string,
    connections: Array<{ id: string; lastReadAt: Date | null }>,
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (connections.length === 0) {
      return counts;
    }

    for (const connection of connections) {
      counts.set(connection.id, 0);
    }

    type UnreadRow = { connectionId: string; count: bigint };
    const connectionIds = connections.map((connection) => connection.id);
    const rows = await this.prisma.$queryRaw<UnreadRow[]>`
      SELECT cm."connectionId" AS "connectionId", COUNT(*)::bigint AS count
      FROM "ConnectionMessage" cm
      INNER JOIN "ConnectionParticipantState" cps
        ON cps."connectionId" = cm."connectionId"
        AND cps."userId" = ${userId}
      WHERE cm."senderId" != ${userId}
        AND cm."deletedAt" IS NULL
        AND cm."connectionId" IN (${Prisma.join(connectionIds)})
        AND (cps."lastReadAt" IS NULL OR cm."createdAt" > cps."lastReadAt")
      GROUP BY cm."connectionId"
    `;

    for (const row of rows) {
      counts.set(row.connectionId, Number(row.count));
    }

    return counts;
  }

  private async countTotalUnread(userId: string): Promise<number> {
    type TotalRow = { count: bigint };
    const rows = await this.prisma.$queryRaw<TotalRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "ConnectionMessage" cm
      INNER JOIN "Connection" c ON c.id = cm."connectionId"
      INNER JOIN "ConnectionParticipantState" cps
        ON cps."connectionId" = cm."connectionId"
        AND cps."userId" = ${userId}
      WHERE cm."senderId" != ${userId}
        AND cm."deletedAt" IS NULL
        AND (c."userLowId" = ${userId} OR c."userHighId" = ${userId})
        AND c."endedAt" IS NULL
        AND (cps."lastReadAt" IS NULL OR cm."createdAt" > cps."lastReadAt")
    `;

    return Number(rows[0]?.count ?? 0);
  }

  async getUnreadCount(userId: string) {
    const cached = this.unreadCountCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return { unreadCount: cached.value };
    }

    if (
      cached &&
      cached.expiresAt + MessagesService.UNREAD_COUNT_STALE_TTL_MS > Date.now()
    ) {
      void this.refreshUnreadCount(userId);
      return { unreadCount: cached.value };
    }

    const inflight = this.unreadCountInflight.get(userId);
    if (inflight) {
      return inflight;
    }

    const request = (async () => {
      try {
        await this.requirePaid(userId);
        const unreadCount = await this.countTotalUnread(userId);
        this.unreadCountCache.set(userId, {
          expiresAt: Date.now() + MessagesService.UNREAD_COUNT_CACHE_TTL_MS,
          value: unreadCount,
        });
        return { unreadCount };
      } catch (error) {
        if (isDatabaseUnreachableError(error)) {
          const stale = this.unreadCountCache.get(userId);
          return { unreadCount: stale?.value ?? 0 };
        }
        throw error;
      }
    })().finally(() => {
      this.unreadCountInflight.delete(userId);
    });

    this.unreadCountInflight.set(userId, request);
    return request;
  }

  private refreshUnreadCount(userId: string) {
    if (
      this.unreadCountRefreshing.has(userId) ||
      this.unreadCountInflight.has(userId)
    ) {
      return;
    }
    this.unreadCountRefreshing.add(userId);
    void (async () => {
      try {
        await this.requirePaid(userId);
        const unreadCount = await this.countTotalUnread(userId);
        this.unreadCountCache.set(userId, {
          expiresAt: Date.now() + MessagesService.UNREAD_COUNT_CACHE_TTL_MS,
          value: unreadCount,
        });
      } catch (error) {
        if (!isDatabaseUnreachableError(error)) {
          throw error;
        }
      } finally {
        this.unreadCountRefreshing.delete(userId);
      }
    })();
  }

  async listConversations(userId: string) {
    const cached = this.conversationsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inflight = this.conversationsInflight.get(userId);
    if (inflight) {
      return inflight;
    }

    const request = this.fetchConversations(userId).finally(() => {
      this.conversationsInflight.delete(userId);
    });
    this.conversationsInflight.set(userId, request);
    return request;
  }

  private async fetchConversations(userId: string) {
    const [fullNameRule] = await Promise.all([
      this.privacyFields.getFullNameRule(),
      this.requirePaid(userId),
    ]);
    const connections = await this.prisma.connection.findMany({
      where: {
        endedAt: null,
        OR: [{ userLowId: userId }, { userHighId: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: messageSelect,
        },
        participantStates: {
          where: { userId },
          select: { lastReadAt: true },
        },
        userLow: { select: connectionMemberSelect },
        userHigh: { select: connectionMemberSelect },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const unreadByConnection = await this.countUnreadByConnection(
      userId,
      connections.map((connection) => ({
        id: connection.id,
        lastReadAt: connection.participantStates[0]?.lastReadAt ?? null,
      })),
    );

    const itemsUnsorted = connections.map((connection) => {
        const isLow = connection.userLowId === userId;
        const otherUser = isLow ? connection.userHigh : connection.userLow;
        const lastMessage = connection.messages[0] ?? null;
        const lastReadAt =
          connection.participantStates[0]?.lastReadAt?.toISOString() ?? null;
        const unreadCount = unreadByConnection.get(connection.id) ?? 0;

        return {
          connectionId: connection.id,
          member: this.serializeMember(
            otherUser,
            connection.privacyLevel,
            fullNameRule,
          ),
          lastMessage: lastMessage
            ? this.serializeMessage(lastMessage, userId, null)
            : null,
          unreadCount,
          lastReadAt,
          updatedAt: (
            lastMessage?.createdAt ?? connection.updatedAt
          ).toISOString(),
        };
      });

    const items = itemsUnsorted.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    this.conversationsCache.set(userId, {
      expiresAt: Date.now() + MessagesService.CONVERSATIONS_CACHE_TTL_MS,
      value: items,
    });
    return items;
  }

  invalidateUserMessageCaches(userId: string) {
    this.invalidateConversationCaches(userId);
    this.conversationsInflight.delete(userId);
    this.unreadCountInflight.delete(userId);
    for (const key of this.threadMetaCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.threadMetaCache.delete(key);
      }
    }
    for (const key of this.sincePollCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.sincePollCache.delete(key);
      }
    }
  }

  private invalidateConversationCaches(userId: string) {
    this.conversationsCache.delete(userId);
    this.unreadCountCache.delete(userId);
    invalidateAlertsSummaryCache(userId);
  }

  async listMessages(
    userId: string,
    connectionId: string,
    limit = 50,
    before?: string,
    markRead = true,
    since?: string,
  ) {
    const take = Math.min(Math.max(limit, 1), 100);
    const beforeDate = before ? new Date(before) : undefined;
    if (beforeDate && Number.isNaN(beforeDate.getTime())) {
      throw new BadRequestException('Invalid before cursor');
    }
    const sinceDate = since ? new Date(since) : undefined;
    if (sinceDate && Number.isNaN(sinceDate.getTime())) {
      throw new BadRequestException('Invalid since cursor');
    }

    if (sinceDate) {
      return this.listMessagesSince(userId, connectionId, sinceDate, take);
    }

    const [connection, fullNameRule] = await Promise.all([
      this.assertConnectionMember(userId, connectionId),
      this.privacyFields.getFullNameRule(),
      this.requirePaid(userId),
    ]);

    const otherUserId = this.otherUserId(connection, userId);
    const isLow = connection.userLowId === userId;
    const otherUser = isLow ? connection.userHigh : connection.userLow;

    const [messages, participantStates, partnerTyping] = await Promise.all([
      this.prisma.connectionMessage.findMany({
        where: {
          connectionId,
          ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take,
        select: messageSelect,
      }),
      this.getParticipantStates(connectionId, [userId, otherUserId]),
      this.isTyping(connectionId, otherUser.id),
    ]);

    if (markRead && !beforeDate) {
      void this.markRead(userId, connectionId);
    }

    const partnerState = participantStates.get(otherUserId);
    const myState = participantStates.get(userId);
    const partnerLastReadAt = partnerState?.lastReadAt ?? null;
    const member = this.serializeMember(
      otherUser,
      connection.privacyLevel,
      fullNameRule,
    );
    this.threadMetaCache.set(`${userId}:${connectionId}`, {
      expiresAt: Date.now() + MessagesService.THREAD_META_CACHE_TTL_MS,
      value: { member, privacyLevel: connection.privacyLevel },
    });

    return {
      connectionId,
      member,
      messages: messages
        .reverse()
        .map((message) =>
          this.serializeMessage(message, userId, partnerLastReadAt),
        ),
      hasMore: messages.length === take,
      partnerLastReadAt: partnerLastReadAt?.toISOString() ?? null,
      myLastReadAt: myState?.lastReadAt?.toISOString() ?? null,
      partnerTyping,
      partnerIsPaused: otherUser.profile?.isPaused ?? false,
      viewerIsPaused: isLow
        ? connection.userLow.profile?.isPaused ?? false
        : connection.userHigh.profile?.isPaused ?? false,
    };
  }

  private async listMessagesSince(
    userId: string,
    connectionId: string,
    sinceDate: Date,
    take: number,
  ): Promise<MessageThreadSincePayload> {
    const cacheKey = `${userId}:${connectionId}:${sinceDate.toISOString()}`;
    const cached = this.sincePollCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    await this.requirePaid(userId);

    const access = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        OR: [{ userLowId: userId }, { userHighId: userId }],
      },
      select: {
        userLowId: true,
        userHighId: true,
        privacyLevel: true,
        endedAt: true,
      },
    });
    if (!access) {
      throw new NotFoundException('Connection not found');
    }
    if (access.endedAt) {
      throw new ForbiddenException('This connection has ended');
    }

    const otherUserId =
      access.userLowId === userId ? access.userHighId : access.userLowId;
    const metaKey = `${userId}:${connectionId}`;
    const cachedMeta = this.threadMetaCache.get(metaKey);
    const member =
      cachedMeta && cachedMeta.expiresAt > Date.now()
        ? cachedMeta.value.member
        : {
            userId: otherUserId,
            profileId: null,
            profileCode: null,
            fullName: null,
            currentDistrict: null,
            isVerified: false,
          };

    const [messages, partnerState, partnerTyping] = await Promise.all([
      this.prisma.connectionMessage.findMany({
        where: {
          connectionId,
          createdAt: { gt: sinceDate },
        },
        orderBy: { createdAt: 'asc' },
        take,
        select: messageSelect,
      }),
      this.getParticipantState(connectionId, otherUserId),
      this.isTyping(connectionId, otherUserId),
    ]);

    const partnerLastReadAt = partnerState?.lastReadAt ?? null;

    const value = {
      connectionId,
      member,
      messages: messages.map((message) =>
        this.serializeMessage(message, userId, partnerLastReadAt),
      ),
      hasMore: false,
      partnerLastReadAt: partnerLastReadAt?.toISOString() ?? null,
      myLastReadAt: null,
      partnerTyping,
    };
    this.sincePollCache.set(cacheKey, {
      expiresAt: Date.now() + MessagesService.SINCE_POLL_CACHE_TTL_MS,
      value,
    });
    return value;
  }

  async markRead(userId: string, connectionId: string) {
    await this.requirePaid(userId);
    await this.assertConnectionMember(userId, connectionId);
    const now = new Date();
    await this.prisma.connectionParticipantState.upsert({
      where: {
        connectionId_userId: { connectionId, userId },
      },
      create: {
        connectionId,
        userId,
        lastReadAt: now,
      },
      update: {
        lastReadAt: now,
      },
    });
    this.invalidateConversationCaches(userId);
    return { lastReadAt: now.toISOString() };
  }

  async setTyping(userId: string, connectionId: string) {
    await this.requirePaid(userId);
    await this.profilePause.assertCanSendConnectionActions(userId);
    await this.assertConnectionMember(userId, connectionId);
    const key = this.typingKey(connectionId, userId);
    await this.redis.set(key, '1', TYPING_TTL_SECONDS);
    return { ok: true };
  }

  async sendMessage(userId: string, connectionId: string, body: string) {
    await this.requirePaid(userId);
    await this.profilePause.assertCanSendConnectionActions(userId);
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty');
    }

    const connection = await this.assertConnectionMember(userId, connectionId);

    const message = await this.createMessage({
      connectionId,
      senderId: userId,
      messageType: ConnectionMessageType.text,
      body: trimmed,
    });

    void this.notifyRecipientNewMessage(connection, userId, trimmed);

    return this.serializeMessage(message, userId, null);
  }

  async sendAttachment(
    userId: string,
    connectionId: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    await this.requirePaid(userId);
    await this.profilePause.assertCanSendConnectionActions(userId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('File must be 5 MB or smaller');
    }
    if (!ALLOWED_ATTACHMENT_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP images and PDF files are allowed',
      );
    }

    const connection = await this.assertConnectionMember(userId, connectionId);

    const messageType =
      file.mimetype.startsWith('image/')
        ? ConnectionMessageType.image
        : ConnectionMessageType.file;

    const storageKey = await this.storage.save(
      userId,
      'messages',
      file.buffer,
      file.mimetype,
    );

    const body = caption?.trim() ?? '';

    try {
      const message = await this.createMessage({
        connectionId,
        senderId: userId,
        messageType,
        body,
        attachmentStorageKey: storageKey,
        attachmentMimeType: file.mimetype,
        attachmentFileName: file.originalname || 'attachment',
      });

      const preview =
        body ||
        (messageType === ConnectionMessageType.image ? 'Sent a photo' : 'Sent a file');
      void this.notifyRecipientNewMessage(connection, userId, preview);

      return this.serializeMessage(message, userId, null);
    } catch (error) {
      await this.storage.delete(storageKey);
      throw error;
    }
  }

  async updateMessage(
    userId: string,
    connectionId: string,
    messageId: string,
    body: string,
  ) {
    await this.requirePaid(userId);
    await this.profilePause.assertCanSendConnectionActions(userId);
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty');
    }

    await this.assertConnectionMember(userId, connectionId);

    const message = await this.prisma.connectionMessage.findFirst({
      where: { id: messageId, connectionId },
      select: messageSelect,
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }
    if (message.messageType !== ConnectionMessageType.text) {
      throw new BadRequestException('Only text messages can be edited');
    }
    await this.assertMessageNotReadByPartner(userId, connectionId, message.createdAt);
    if (Date.now() - message.createdAt.getTime() > MESSAGE_EDIT_WINDOW_MS) {
      throw new BadRequestException(
        'Messages can only be edited within 15 minutes',
      );
    }

    const updated = await this.prisma.connectionMessage.update({
      where: { id: messageId },
      data: {
        body: trimmed,
        editedAt: new Date(),
      },
      select: messageSelect,
    });

    return this.serializeMessage(updated, userId, null);
  }

  async deleteMessage(userId: string, connectionId: string, messageId: string) {
    await this.requirePaid(userId);
    await this.profilePause.assertCanSendConnectionActions(userId);
    await this.assertConnectionMember(userId, connectionId);

    const message = await this.prisma.connectionMessage.findFirst({
      where: { id: messageId, connectionId },
      select: messageSelect,
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }
    await this.assertMessageNotReadByPartner(userId, connectionId, message.createdAt);

    const updated = await this.prisma.connectionMessage.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        body: '',
      },
      select: messageSelect,
    });

    return this.serializeMessage(updated, userId, null);
  }

  async getAttachmentStream(
    userId: string,
    connectionId: string,
    messageId: string,
  ) {
    await this.requirePaid(userId);
    await this.assertConnectionMember(userId, connectionId);

    const message = await this.prisma.connectionMessage.findFirst({
      where: { id: messageId, connectionId, deletedAt: null },
      select: {
        attachmentStorageKey: true,
        attachmentMimeType: true,
        attachmentFileName: true,
      },
    });

    if (!message?.attachmentStorageKey) {
      throw new NotFoundException('Attachment not found');
    }

    if (!(await this.storage.exists(message.attachmentStorageKey))) {
      throw new NotFoundException('Attachment file missing');
    }

    return {
      stream: await this.storage.createReadStream(message.attachmentStorageKey),
      mimeType: message.attachmentMimeType ?? 'application/octet-stream',
      fileName: message.attachmentFileName ?? 'attachment',
    };
  }

  private async createMessage(data: {
    connectionId: string;
    senderId: string;
    messageType: ConnectionMessageType;
    body: string;
    attachmentStorageKey?: string;
    attachmentMimeType?: string;
    attachmentFileName?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.connectionMessage.create({
        data,
        select: messageSelect,
      });
      await tx.connection.update({
        where: { id: data.connectionId },
        data: { updatedAt: new Date() },
      });
      return created;
    });
  }

  private serializeMember(
    user: {
      id: string;
      profile: {
        id: string;
        profileCode: string;
        fullName: string | null;
        currentDistrict: string | null;
        isVerified: boolean;
        isPaused: boolean;
      } | null;
    },
    privacyLevel: number,
    fullNameRule: { isShareable: boolean; minPrivacyLevel: number },
  ) {
    return {
      userId: user.id,
      profileId: user.profile?.id ?? null,
      profileCode: user.profile?.profileCode ?? null,
      fullName: resolveVisibleFullName(
        user.profile?.fullName ?? null,
        privacyLevel,
        fullNameRule,
      ),
      currentDistrict: user.profile?.currentDistrict ?? null,
      isVerified: user.profile?.isVerified ?? false,
      isPaused: user.profile?.isPaused ?? false,
    };
  }

  private serializeMessage(
    message: MessageRow,
    viewerId: string,
    partnerLastReadAt: Date | null,
  ) {
    const isMine = message.senderId === viewerId;
    const isDeleted = Boolean(message.deletedAt);
    let deliveryStatus: 'read' | 'delivered' | null = null;

    if (isMine && !isDeleted) {
      deliveryStatus =
        partnerLastReadAt && message.createdAt <= partnerLastReadAt
          ? 'read'
          : 'delivered';
    }

    return {
      id: message.id,
      senderId: message.senderId,
      messageType: message.messageType,
      body: isDeleted ? null : message.body,
      isMine,
      isDeleted,
      isEdited: Boolean(message.editedAt),
      deliveryStatus,
      attachment:
        !isDeleted && message.attachmentStorageKey
          ? {
              fileName: message.attachmentFileName,
              mimeType: message.attachmentMimeType,
              hasFile: true,
            }
          : null,
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt?.toISOString() ?? null,
    };
  }

  private async getParticipantState(connectionId: string, userId: string) {
    return this.prisma.connectionParticipantState.findUnique({
      where: {
        connectionId_userId: { connectionId, userId },
      },
    });
  }

  private async getParticipantStates(
    connectionId: string,
    userIds: string[],
  ) {
    const rows = await this.prisma.connectionParticipantState.findMany({
      where: {
        connectionId,
        userId: { in: userIds },
      },
    });
    return new Map(rows.map((row) => [row.userId, row]));
  }

  private otherUserId(
    connection: { userLowId: string; userHighId: string },
    userId: string,
  ) {
    return connection.userLowId === userId
      ? connection.userHighId
      : connection.userLowId;
  }

  private typingKey(connectionId: string, userId: string) {
    return `msg:typing:${connectionId}:${userId}`;
  }

  private async isTyping(connectionId: string, userId: string) {
    const value = await this.redis.get(this.typingKey(connectionId, userId));
    return value === '1';
  }

  private async assertMessageNotReadByPartner(
    userId: string,
    connectionId: string,
    messageCreatedAt: Date,
  ) {
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        OR: [{ userLowId: userId }, { userHighId: userId }],
      },
      select: { userLowId: true, userHighId: true },
    });
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }
    const partnerId = this.otherUserId(connection, userId);
    const partnerState = await this.getParticipantState(connectionId, partnerId);
    if (
      isConnectionMessageReadByPartner(
        messageCreatedAt,
        partnerState?.lastReadAt,
      )
    ) {
      throw new BadRequestException(
        'Messages cannot be edited or deleted after they have been read',
      );
    }
  }

  private async assertConnectionMember(userId: string, connectionId: string) {
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        OR: [{ userLowId: userId }, { userHighId: userId }],
      },
      include: {
        userLow: { select: connectionMemberSelect },
        userHigh: { select: connectionMemberSelect },
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.endedAt) {
      throw new ForbiddenException('This connection has ended');
    }

    if (!connection.userLow.isActive || !connection.userHigh.isActive) {
      throw new ForbiddenException(
        'Messaging is not available for this connection',
      );
    }

    return connection;
  }

  private async notifyRecipientNewMessage(
    connection: Awaited<ReturnType<MessagesService['assertConnectionMember']>>,
    senderId: string,
    preview: string,
  ) {
    try {
      const recipientId =
        connection.userLowId === senderId
          ? connection.userHighId
          : connection.userLowId;
      const sender =
        connection.userLowId === senderId
          ? connection.userLow
          : connection.userHigh;
      const senderName = sender.profile?.fullName?.trim() || 'A new message';
      const trimmedPreview =
        preview.length > 80 ? `${preview.slice(0, 77)}...` : preview;

      await this.pushNotifications.sendToUser(recipientId, {
        title: 'New message',
        body: `${senderName}: ${trimmedPreview}`,
        channelId: PUSH_CHANNEL_MESSAGES,
        ...MEMBER_INCOMING_PUSH,
        data: {
          type: 'message',
          connectionId: connection.id,
        },
      });
    } catch {
      // Push delivery must not block messaging.
    }
  }
}
