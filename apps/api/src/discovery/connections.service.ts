import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InterestStatus, Prisma } from '@prisma/client';
import { PrivacyLevel, resolveVisibleFullName } from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import { SubscriptionAccessService } from '../subscriptions/subscription-access.service';
import {
  MEMBER_INCOMING_PUSH,
  PUSH_CHANNEL_ACTIVITY,
  PushNotificationService,
} from '../push/push-notification.service';
import { invalidateHomeBootstrapCache } from './discovery-home-bootstrap-cache';
import { invalidateAlertsSummaryCache } from './alerts-summary-cache';
import { invalidateDiscoveryListCache } from './discovery-list-cache';
import { ProfilePauseService } from '../profiles/profile-pause.service';

const interestProfileSelect = {
  id: true,
  profileCode: true,
  fullName: true,
  gender: true,
  currentDistrict: true,
  currentDivision: true,
  isVerified: true,
  isPaused: true,
} satisfies Prisma.ProfileSelect;

type InterestProfile = Prisma.ProfileGetPayload<{
  select: typeof interestProfileSelect;
}>;

type RedactedInterestProfile = {
  id: string;
  profileCode: string | null;
  fullName: string | null;
  gender: string | null;
  currentDistrict: string | null;
  currentDivision: string | null;
  isVerified: boolean;
};

type MemberDiscoveryStats = {
  incoming: number;
  outgoing: number;
  connections: number;
  conversations: number;
};

@Injectable()
export class ConnectionsService {
  private static readonly INTERESTS_CACHE_TTL_MS = 30_000;
  private static readonly CONNECTIONS_CACHE_TTL_MS = 30_000;
  private static readonly MEMBER_STATS_CACHE_TTL_MS = 30_000;
  private readonly interestsCache = new Map<
    string,
    {
      expiresAt: number;
      value: {
        incoming: Awaited<ReturnType<ConnectionsService['listIncomingInterests']>>;
        outgoing: Awaited<ReturnType<ConnectionsService['listOutgoingInterests']>>;
      };
    }
  >();
  private readonly interestsInflight = new Map<
    string,
    Promise<{
      incoming: Awaited<ReturnType<ConnectionsService['listIncomingInterests']>>;
      outgoing: Awaited<ReturnType<ConnectionsService['listOutgoingInterests']>>;
    }>
  >();
  private readonly connectionsCache = new Map<
    string,
    {
      expiresAt: number;
      value: Awaited<ReturnType<ConnectionsService['fetchMyConnections']>>;
    }
  >();
  private readonly connectionsInflight = new Map<
    string,
    Promise<Awaited<ReturnType<ConnectionsService['fetchMyConnections']>>>
  >();
  private readonly memberStatsCache = new Map<
    string,
    {
      expiresAt: number;
      value: MemberDiscoveryStats;
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionAccess: SubscriptionAccessService,
    private readonly privacyFields: PrivacyFieldsService,
    private readonly pushNotifications: PushNotificationService,
    private readonly profilePause: ProfilePauseService,
  ) {}

  canonicalPair(userAId: string, userBId: string): [string, string] {
    return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  }

  async getViewerPrivacyLevel(
    viewerUserId: string,
    profileUserId: string,
  ): Promise<number> {
    if (viewerUserId === profileUserId) {
      return PrivacyLevel.SERIOUS_CONSIDERATION;
    }

    const [lowId, highId] = this.canonicalPair(viewerUserId, profileUserId);
    const connection = await this.prisma.connection.findUnique({
      where: { userLowId_userHighId: { userLowId: lowId, userHighId: highId } },
    });

    return connection?.privacyLevel ?? PrivacyLevel.PUBLIC;
  }

  async batchGetListRelationshipSummaries(
    viewerUserId: string,
    profileUserIds: string[],
  ) {
    const uniqueIds = [...new Set(profileUserIds.filter((id) => id !== viewerUserId))];
    const summaries = new Map<
      string,
      { status: 'none' | 'interest_sent' | 'interest_received' | 'connected'; viewerPrivacyLevel: number }
    >();

    if (uniqueIds.length === 0) {
      return summaries;
    }

    const [sentInterests, receivedInterests, connections] = await Promise.all([
      this.prisma.interest.findMany({
        where: {
          senderId: viewerUserId,
          receiverId: { in: uniqueIds },
        },
      }),
      this.prisma.interest.findMany({
        where: {
          senderId: { in: uniqueIds },
          receiverId: viewerUserId,
        },
      }),
      this.prisma.connection.findMany({
        where: {
          OR: [
            { userLowId: viewerUserId, userHighId: { in: uniqueIds } },
            { userHighId: viewerUserId, userLowId: { in: uniqueIds } },
          ],
        },
      }),
    ]);

    const sentByReceiver = new Map(
      sentInterests.map((interest) => [interest.receiverId, interest]),
    );
    const receivedBySender = new Map(
      receivedInterests.map((interest) => [interest.senderId, interest]),
    );
    const connectionByOther = new Map(
      connections.map((connection) => [
        connection.userLowId === viewerUserId
          ? connection.userHighId
          : connection.userLowId,
        connection,
      ]),
    );

    for (const profileUserId of uniqueIds) {
      summaries.set(
        profileUserId,
        this.buildListRelationshipSummary(
          sentByReceiver.get(profileUserId),
          receivedBySender.get(profileUserId),
          connectionByOther.get(profileUserId),
        ),
      );
    }

    return summaries;
  }

  async getRelationshipSummary(viewerUserId: string, profileUserId: string) {
    if (viewerUserId === profileUserId) {
      return {
        status: 'self' as const,
        viewerPrivacyLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
        connectionPrivacyLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
        pendingUpgradeLevel: null,
        pendingUpgradeByMe: false,
        partnerIsPaused: false,
      };
    }

    const [sentInterest, receivedInterest, connection, partnerProfile] =
      await Promise.all([
      this.prisma.interest.findUnique({
        where: {
          senderId_receiverId: {
            senderId: viewerUserId,
            receiverId: profileUserId,
          },
        },
      }),
      this.prisma.interest.findUnique({
        where: {
          senderId_receiverId: {
            senderId: profileUserId,
            receiverId: viewerUserId,
          },
        },
      }),
      this.prisma.connection.findUnique({
        where: {
          userLowId_userHighId: {
            userLowId: this.canonicalPair(viewerUserId, profileUserId)[0],
            userHighId: this.canonicalPair(viewerUserId, profileUserId)[1],
          },
        },
      }),
      this.prisma.profile.findUnique({
        where: { userId: profileUserId },
        select: { isPaused: true },
      }),
    ]);

    const viewerPrivacyLevel =
      connection?.privacyLevel ?? PrivacyLevel.PUBLIC;

    let status: 'none' | 'interest_sent' | 'interest_received' | 'connected' =
      'none';
    if (connection) {
      status = 'connected';
    } else if (sentInterest?.status === InterestStatus.pending) {
      status = 'interest_sent';
    } else if (receivedInterest?.status === InterestStatus.pending) {
      status = 'interest_received';
    }

    return {
      status,
      viewerPrivacyLevel,
      connectionId: connection?.id ?? null,
      connectionPrivacyLevel: connection?.privacyLevel ?? null,
      pendingUpgradeLevel: connection?.pendingUpgradeLevel ?? null,
      pendingUpgradeByMe:
        connection?.pendingUpgradeById === viewerUserId &&
        connection.pendingUpgradeLevel != null,
      sentInterestId: sentInterest?.id ?? null,
      receivedInterestId: receivedInterest?.id ?? null,
      sentInterestStatus: sentInterest?.status ?? null,
      receivedInterestStatus: receivedInterest?.status ?? null,
      partnerIsPaused: partnerProfile?.isPaused ?? false,
    };
  }

  async sendInterest(senderId: string, receiverId: string) {
    await this.subscriptionAccess.assertPaidMember(senderId);
    await this.profilePause.assertCanUseDiscovery(senderId);

    if (senderId === receiverId) {
      throw new BadRequestException('You cannot express interest in yourself');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      include: {
        profile: { select: { isVerified: true, isPaused: true } },
      },
    });
    if (!receiver?.profile?.isVerified) {
      throw new BadRequestException(
        'You can only express interest in verified profiles',
      );
    }
    if (receiver.profile.isPaused) {
      throw new BadRequestException(
        'This profile is temporarily paused and cannot receive interests',
      );
    }

    const existing = await this.prisma.interest.findUnique({
      where: {
        senderId_receiverId: { senderId, receiverId },
      },
    });
    if (existing?.status === InterestStatus.accepted) {
      throw new BadRequestException('You are already connected');
    }
    if (existing?.status === InterestStatus.pending) {
      throw new BadRequestException('Interest already sent');
    }

    const reverse = await this.prisma.interest.findUnique({
      where: {
        senderId_receiverId: { senderId: receiverId, receiverId: senderId },
      },
    });

    if (reverse?.status === InterestStatus.pending) {
      await this.prisma.$transaction([
        this.prisma.interest.update({
          where: { id: reverse.id },
          data: { status: InterestStatus.accepted, respondedAt: new Date() },
        }),
        this.prisma.interest.upsert({
          where: {
            senderId_receiverId: { senderId, receiverId },
          },
          create: {
            senderId,
            receiverId,
            status: InterestStatus.accepted,
            respondedAt: new Date(),
          },
          update: {
            status: InterestStatus.accepted,
            respondedAt: new Date(),
          },
        }),
      ]);
      await this.ensureConnection(senderId, receiverId);
      this.invalidateDiscoveryCachesForPair(senderId, receiverId);
      void this.notifyConnectionEstablished(senderId, receiverId);
      return { mutual: true, status: 'connected' };
    }

    await this.prisma.interest.upsert({
      where: {
        senderId_receiverId: { senderId, receiverId },
      },
      create: { senderId, receiverId, status: InterestStatus.pending },
      update: { status: InterestStatus.pending, respondedAt: null },
    });

    this.invalidateDiscoveryCachesForPair(senderId, receiverId);
    void this.notifyInterestReceived(senderId, receiverId);
    return { mutual: false, status: 'interest_sent' };
  }

  async respondToInterest(
    receiverId: string,
    interestId: string,
    accept: boolean,
  ) {
    await this.subscriptionAccess.assertPaidMember(receiverId);
    if (accept) {
      await this.profilePause.assertCanSendConnectionActions(receiverId);
    }

    const interest = await this.prisma.interest.findFirst({
      where: { id: interestId, receiverId },
    });
    if (!interest) {
      throw new NotFoundException('Interest not found');
    }
    if (interest.status !== InterestStatus.pending) {
      throw new BadRequestException('Interest has already been responded to');
    }

    const now = new Date();
    if (!accept) {
      await this.prisma.interest.update({
        where: { id: interest.id },
        data: { status: InterestStatus.declined, respondedAt: now },
      });
      this.invalidateDiscoveryCachesForPair(interest.senderId, receiverId);
      return {
        status: 'declined',
        senderId: interest.senderId,
        receiverId,
      };
    }

    await this.prisma.interest.update({
      where: { id: interest.id },
      data: { status: InterestStatus.accepted, respondedAt: now },
    });
    await this.ensureConnection(interest.senderId, receiverId);
    this.invalidateDiscoveryCachesForPair(interest.senderId, receiverId);
    void this.notifyConnectionEstablished(interest.senderId, receiverId);
    return {
      status: 'connected',
      senderId: interest.senderId,
      receiverId,
    };
  }

  async requestPrivacyUpgrade(userId: string, otherUserId: string) {
    await this.subscriptionAccess.assertPaidMember(userId);
    await this.profilePause.assertCanSendConnectionActions(userId);

    const connection = await this.getConnection(userId, otherUserId);
    if (!connection) {
      throw new BadRequestException('You must be connected first');
    }
    if (connection.privacyLevel >= PrivacyLevel.SERIOUS_CONSIDERATION) {
      throw new BadRequestException('Already at maximum privacy level');
    }
    if (
      connection.pendingUpgradeLevel != null &&
      connection.pendingUpgradeById !== userId
    ) {
      throw new BadRequestException(
        'The other member already requested a privacy upgrade',
      );
    }

    const nextLevel = connection.privacyLevel + 1;
    await this.prisma.connection.update({
      where: { id: connection.id },
      data: {
        pendingUpgradeLevel: nextLevel,
        pendingUpgradeById: userId,
      },
    });
    this.invalidateDiscoveryCachesForPair(userId, otherUserId);
    void this.notifyPrivacyUpgradeRequested(userId, otherUserId, nextLevel);
    return { pendingUpgradeLevel: nextLevel };
  }

  async respondPrivacyUpgrade(
    userId: string,
    otherUserId: string,
    accept: boolean,
  ) {
    await this.subscriptionAccess.assertPaidMember(userId);
    if (accept) {
      await this.profilePause.assertCanSendConnectionActions(userId);
    }

    const connection = await this.getConnection(userId, otherUserId);
    if (!connection?.pendingUpgradeLevel) {
      throw new BadRequestException('No privacy upgrade is pending');
    }
    if (connection.pendingUpgradeById === userId) {
      throw new BadRequestException(
        'Wait for the other member to respond to your upgrade request',
      );
    }

    if (!accept) {
      await this.prisma.connection.update({
        where: { id: connection.id },
        data: { pendingUpgradeLevel: null, pendingUpgradeById: null },
      });
      this.invalidateDiscoveryCachesForPair(userId, otherUserId);
      return { privacyLevel: connection.privacyLevel, accepted: false };
    }

    const requesterId = connection.pendingUpgradeById;
    const updated = await this.prisma.connection.update({
      where: { id: connection.id },
      data: {
        privacyLevel: connection.pendingUpgradeLevel,
        pendingUpgradeLevel: null,
        pendingUpgradeById: null,
      },
    });
    this.invalidateDiscoveryCachesForPair(userId, otherUserId);
    if (requesterId) {
      void this.notifyPrivacyUpgradeAccepted(
        requesterId,
        userId,
        updated.privacyLevel,
      );
    }
    return { privacyLevel: updated.privacyLevel, accepted: true };
  }

  async listMyConnections(userId: string) {
    const cached = this.connectionsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inflight = this.connectionsInflight.get(userId);
    if (inflight) {
      return inflight;
    }

    const request = this.fetchMyConnections(userId)
      .then((value) => {
        this.connectionsCache.set(userId, {
          expiresAt: Date.now() + ConnectionsService.CONNECTIONS_CACHE_TTL_MS,
          value,
        });
        return value;
      })
      .finally(() => {
        this.connectionsInflight.delete(userId);
      });
    this.connectionsInflight.set(userId, request);
    return request;
  }

  invalidateConnectionsCache(userId: string) {
    this.connectionsCache.delete(userId);
    this.connectionsInflight.delete(userId);
    this.memberStatsCache.delete(userId);
    invalidateAlertsSummaryCache(userId);
  }

  private async fetchMyConnections(userId: string) {
    const fullNameRule = await this.privacyFields.getFullNameRule();

    const connections = await this.prisma.connection.findMany({
      where: {
        OR: [{ userLowId: userId }, { userHighId: userId }],
      },
      include: {
        userLow: {
          select: {
            id: true,
            profile: {
              select: {
                id: true,
                profileCode: true,
                fullName: true,
                gender: true,
                currentDistrict: true,
                currentDivision: true,
                isVerified: true,
                isPaused: true,
              },
            },
          },
        },
        userHigh: {
          select: {
            id: true,
            profile: {
              select: {
                id: true,
                profileCode: true,
                fullName: true,
                gender: true,
                currentDistrict: true,
                currentDivision: true,
                isVerified: true,
                isPaused: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return connections.map((connection) => {
      const isLow = connection.userLowId === userId;
      const otherUser = isLow ? connection.userHigh : connection.userLow;

      return {
        connectionId: connection.id,
        privacyLevel: connection.privacyLevel,
        pendingUpgradeLevel: connection.pendingUpgradeLevel,
        pendingUpgradeByMe: connection.pendingUpgradeById === userId,
        updatedAt: connection.updatedAt.toISOString(),
        member: {
          userId: otherUser.id,
          profileId: otherUser.profile?.id ?? null,
          profileCode: otherUser.profile?.profileCode ?? null,
          fullName: resolveVisibleFullName(
            otherUser.profile?.fullName ?? null,
            connection.privacyLevel,
            fullNameRule,
          ),
          gender: otherUser.profile?.gender ?? null,
          currentDistrict: otherUser.profile?.currentDistrict ?? null,
          currentDivision: otherUser.profile?.currentDivision ?? null,
          isVerified: otherUser.profile?.isVerified ?? false,
          isPaused: otherUser.profile?.isPaused ?? false,
        },
      };
    });
  }

  async listInterests(userId: string) {
    const cached = this.interestsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inflight = this.interestsInflight.get(userId);
    if (inflight) {
      return inflight;
    }

    const request = Promise.all([
      this.listIncomingInterests(userId),
      this.listOutgoingInterests(userId),
    ])
      .then(([incoming, outgoing]) => {
        const value = { incoming, outgoing };
        this.interestsCache.set(userId, {
          expiresAt: Date.now() + ConnectionsService.INTERESTS_CACHE_TTL_MS,
          value,
        });
        return value;
      })
      .finally(() => {
        this.interestsInflight.delete(userId);
      });
    this.interestsInflight.set(userId, request);
    return request;
  }

  invalidateInterestsCache(userId: string) {
    this.interestsCache.delete(userId);
    this.interestsInflight.delete(userId);
    this.memberStatsCache.delete(userId);
    invalidateAlertsSummaryCache(userId);
  }

  async getInterestCounts(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.interest.count({
        where: { receiverId: userId, status: InterestStatus.pending },
      }),
      this.prisma.interest.count({
        where: { senderId: userId, status: InterestStatus.pending },
      }),
    ]);
    return { incoming, outgoing };
  }

  async getConnectionCount(userId: string) {
    return this.prisma.connection.count({
      where: {
        OR: [{ userLowId: userId }, { userHighId: userId }],
      },
    });
  }

  async getMemberDiscoveryStats(userId: string): Promise<MemberDiscoveryStats> {
    const cached = this.memberStatsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    type StatsRow = {
      incoming: bigint;
      outgoing: bigint;
      connections: bigint;
    };

    const rows = await this.prisma.$queryRaw<StatsRow[]>`
      SELECT
        (
          SELECT COUNT(*)::bigint
          FROM "Interest"
          WHERE "receiverId" = ${userId}
            AND status = 'pending'
        ) AS incoming,
        (
          SELECT COUNT(*)::bigint
          FROM "Interest"
          WHERE "senderId" = ${userId}
            AND status = 'pending'
        ) AS outgoing,
        (
          SELECT COUNT(*)::bigint
          FROM "Connection"
          WHERE "userLowId" = ${userId}
            OR "userHighId" = ${userId}
        ) AS connections
    `;

    const row = rows[0];
    const connections = Number(row?.connections ?? 0);
    const value = {
      incoming: Number(row?.incoming ?? 0),
      outgoing: Number(row?.outgoing ?? 0),
      connections,
      conversations: connections,
    };

    this.memberStatsCache.set(userId, {
      expiresAt: Date.now() + ConnectionsService.MEMBER_STATS_CACHE_TTL_MS,
      value,
    });

    return value;
  }

  async listIncomingInterests(userId: string) {
    const interests = await this.prisma.interest.findMany({
      where: { receiverId: userId, status: InterestStatus.pending },
      include: {
        sender: {
          select: {
            id: true,
            profile: { select: interestProfileSelect },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return interests.map((interest) => ({
      id: interest.id,
      createdAt: interest.createdAt.toISOString(),
      disclosureLevel: PrivacyLevel.PUBLIC,
      sender: {
        id: interest.sender.id,
        profile: this.redactInterestProfile(interest.sender.profile, 'incoming'),
      },
    }));
  }

  async listOutgoingInterests(userId: string) {
    const interests = await this.prisma.interest.findMany({
      where: { senderId: userId, status: InterestStatus.pending },
      include: {
        receiver: {
          select: {
            id: true,
            profile: { select: interestProfileSelect },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return interests.map((interest) => ({
      id: interest.id,
      createdAt: interest.createdAt.toISOString(),
      disclosureLevel: PrivacyLevel.PUBLIC,
      receiver: {
        id: interest.receiver.id,
        profile: this.redactInterestProfile(interest.receiver.profile, 'outgoing'),
      },
    }));
  }

  async withdrawInterest(senderId: string, interestId: string) {
    const interest = await this.prisma.interest.findFirst({
      where: { id: interestId, senderId, status: InterestStatus.pending },
    });
    if (!interest) {
      throw new NotFoundException('Interest not found');
    }

    await this.prisma.interest.delete({ where: { id: interest.id } });
    this.invalidateDiscoveryCachesForPair(senderId, interest.receiverId);
    return {
      withdrawn: true,
      senderId,
      receiverId: interest.receiverId,
    };
  }

  private invalidateDiscoveryCachesForPair(userAId: string, userBId: string) {
    this.invalidateConnectionsCache(userAId);
    this.invalidateConnectionsCache(userBId);
    this.invalidateInterestsCache(userAId);
    this.invalidateInterestsCache(userBId);
    invalidateHomeBootstrapCache(userAId);
    invalidateHomeBootstrapCache(userBId);
    invalidateDiscoveryListCache(userAId);
    invalidateDiscoveryListCache(userBId);
  }

  private buildListRelationshipSummary(
    sentInterest:
      | {
          status: InterestStatus;
        }
      | undefined,
    receivedInterest:
      | {
          status: InterestStatus;
        }
      | undefined,
    connection:
      | {
          privacyLevel: number;
        }
      | undefined,
  ) {
    const viewerPrivacyLevel =
      connection?.privacyLevel ?? PrivacyLevel.PUBLIC;

    let status: 'none' | 'interest_sent' | 'interest_received' | 'connected' =
      'none';
    if (connection) {
      status = 'connected';
    } else if (sentInterest?.status === InterestStatus.pending) {
      status = 'interest_sent';
    } else if (receivedInterest?.status === InterestStatus.pending) {
      status = 'interest_received';
    }

    return { status, viewerPrivacyLevel };
  }

  private async ensureConnection(userAId: string, userBId: string) {
    const [userLowId, userHighId] = this.canonicalPair(userAId, userBId);
    await this.prisma.connection.upsert({
      where: { userLowId_userHighId: { userLowId, userHighId } },
      create: {
        userLowId,
        userHighId,
        privacyLevel: PrivacyLevel.BASIC_MUTUAL_INTEREST,
      },
      update: {},
    });
  }

  private async getConnection(userAId: string, userBId: string) {
    const [userLowId, userHighId] = this.canonicalPair(userAId, userBId);
    return this.prisma.connection.findUnique({
      where: { userLowId_userHighId: { userLowId, userHighId } },
    });
  }

  private redactInterestProfile(
    profile: InterestProfile | null,
    _direction: 'incoming' | 'outgoing',
  ): RedactedInterestProfile | null {
    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      profileCode: profile.profileCode,
      fullName: null,
      gender: profile.gender,
      currentDistrict: profile.currentDistrict,
      currentDivision: profile.currentDivision,
      isVerified: profile.isVerified,
    };
  }

  private async notifyConnectionEstablished(userAId: string, userBId: string) {
    try {
      await Promise.all([
        this.pushNotifications.sendToUser(userAId, {
          title: 'New connection',
          body: 'You are now connected. Open Connections to message and view more biodata.',
          data: { type: 'connection' },
          channelId: PUSH_CHANNEL_ACTIVITY,
          ...MEMBER_INCOMING_PUSH,
        }),
        this.pushNotifications.sendToUser(userBId, {
          title: 'New connection',
          body: 'You are now connected. Open Connections to message and view more biodata.',
          data: { type: 'connection' },
          channelId: PUSH_CHANNEL_ACTIVITY,
          ...MEMBER_INCOMING_PUSH,
        }),
      ]);
    } catch {
      // Push delivery must not block connection flow.
    }
  }

  private async notifyInterestReceived(senderId: string, receiverId: string) {
    try {
      const sender = await this.prisma.user.findUnique({
        where: { id: senderId },
        select: { profile: { select: { fullName: true, profileCode: true } } },
      });
      const senderLabel =
        sender?.profile?.fullName?.trim() ||
        sender?.profile?.profileCode?.trim() ||
        'Someone';

      await this.pushNotifications.sendToUser(receiverId, {
        title: 'New interest',
        body: `${senderLabel} expressed interest in your profile`,
        data: { type: 'interest' },
        channelId: PUSH_CHANNEL_ACTIVITY,
        ...MEMBER_INCOMING_PUSH,
      });
    } catch {
      // Push delivery must not block interest flow.
    }
  }

  private async notifyPrivacyUpgradeRequested(
    requesterId: string,
    recipientId: string,
    nextLevel: number,
  ) {
    try {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { profile: { select: { fullName: true, profileCode: true } } },
      });
      const requesterLabel =
        requester?.profile?.fullName?.trim() ||
        requester?.profile?.profileCode?.trim() ||
        'A connection';

      await this.pushNotifications.sendToUser(recipientId, {
        title: 'Privacy upgrade request',
        body: `${requesterLabel} requested a privacy upgrade to level ${nextLevel}`,
        data: { type: 'privacy_upgrade' },
        channelId: PUSH_CHANNEL_ACTIVITY,
        ...MEMBER_INCOMING_PUSH,
      });
    } catch {
      // Push delivery must not block upgrade flow.
    }
  }

  private async notifyPrivacyUpgradeAccepted(
    requesterId: string,
    _responderId: string,
    privacyLevel: number,
  ) {
    try {
      await this.pushNotifications.sendToUser(requesterId, {
        title: 'Privacy upgrade accepted',
        body: `Your connection accepted the upgrade to privacy level ${privacyLevel}`,
        data: { type: 'privacy_upgrade_accepted' },
        channelId: PUSH_CHANNEL_ACTIVITY,
        ...MEMBER_INCOMING_PUSH,
      });
    } catch {
      // Push delivery must not block upgrade flow.
    }
  }
}
