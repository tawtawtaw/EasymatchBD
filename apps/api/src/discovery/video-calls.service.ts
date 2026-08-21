import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  MIN_VIDEO_CALL_PRIVACY_LEVEL,
  resolveVisibleFullName,
  VIDEO_CALL_EMPTY_ROOM_GRACE_MS,
  VIDEO_CALL_MAX_DURATION_MS,
  VIDEO_CALL_OVERDUE_GRACE_MS,
  VIDEO_CALL_REMINDER_WINDOW_MS,
  canJoinScheduledVideoCall,
  isInVideoCallReminderWindow,
  isVideoCallPastMaxDuration,
  videoCallLiveKitTtlSeconds,
} from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import { SubscriptionAccessService } from '../subscriptions/subscription-access.service';
import { LiveKitService } from './livekit.service';
import { PushNotificationService, MEMBER_INCOMING_PUSH, PUSH_CHANNEL_ACTIVITY, PUSH_CHANNEL_CALLS } from '../push/push-notification.service';
import { ProfilePauseService } from '../profiles/profile-pause.service';
import { invalidateAlertsSummaryCache } from './alerts-summary-cache';
import { VideoCallStatus, Prisma } from '@prisma/client';

function serializeCall(
  call: {
    id: string;
    connectionId: string;
    initiatorId: string;
    scheduledAt: Date | null;
    status: VideoCallStatus;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    consultantEngagementId?: string | null;
  },
  viewerId: string,
) {
  return {
    id: call.id,
    connectionId: call.connectionId,
    initiatorId: call.initiatorId,
    isInitiator: call.initiatorId === viewerId,
    scheduledAt: call.scheduledAt?.toISOString() ?? null,
    status: call.status,
    startedAt: call.startedAt?.toISOString() ?? null,
    endedAt: call.endedAt?.toISOString() ?? null,
    createdAt: call.createdAt.toISOString(),
    updatedAt: call.updatedAt.toISOString(),
    consultantEngagementId: call.consultantEngagementId ?? null,
  };
}

type VideoCallAlertKind =
  | 'incoming'
  | 'scheduled_partner'
  | 'scheduled_reminder'
  | 'scheduled_starting';

type VideoCallAlert = {
  kind: VideoCallAlertKind;
  call: ReturnType<typeof serializeCall>;
  partnerName: string | null;
};

type CallWithConnectionMembers = {
  id: string;
  connectionId: string;
  initiatorId: string;
  status: VideoCallStatus;
  startedAt: Date | null;
  createdAt: Date;
  connection?: {
    userLowId: string;
    userHighId: string;
  };
};

@Injectable()
export class VideoCallsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoCallsService.name);
  private staleSweepAt = 0;
  private staleSweepRunning = false;
  private staleSweepTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly OVERDUE_SWEEP_INTERVAL_MS = 60_000;
  private readonly callAlertsCache = new Map<
    string,
    { expiresAt: number; value: VideoCallAlert[] }
  >();
  private static readonly CALL_ALERTS_CACHE_TTL_MS = 3_000;
  private static readonly CALL_ALERTS_STALE_TTL_MS = 30_000;
  private readonly listCallsCache = new Map<
    string,
    { expiresAt: number; value: ReturnType<typeof serializeCall>[] }
  >();
  private readonly callSnapshotCache = new Map<
    string,
    { expiresAt: number; value: ReturnType<typeof serializeCall> }
  >();
  private readonly callAlertsInflight = new Map<
    string,
    Promise<VideoCallAlert[]>
  >();
  private readonly listCallsInflight = new Map<
    string,
    Promise<ReturnType<typeof serializeCall>[]>
  >();
  private static readonly LIST_CALLS_CACHE_TTL_MS = 8_000;
  private static readonly LIST_CALLS_EMPTY_CACHE_TTL_MS = 45_000;
  private static readonly CALL_SNAPSHOT_CACHE_TTL_MS = 2_000;
  private static readonly CALL_SNAPSHOT_ACTIVE_CACHE_TTL_MS = 8_000;
  private liveKitStatusCache: { configured: boolean } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionAccess: SubscriptionAccessService,
    private readonly privacyFields: PrivacyFieldsService,
    private readonly livekit: LiveKitService,
    private readonly pushNotifications: PushNotificationService,
    private readonly profilePause: ProfilePauseService,
  ) {}

  onModuleInit() {
    this.staleSweepTimer = setInterval(() => {
      void this.sweepStaleCalls();
    }, VideoCallsService.OVERDUE_SWEEP_INTERVAL_MS);
    void this.sweepStaleCalls();
  }

  onModuleDestroy() {
    if (this.staleSweepTimer) {
      clearInterval(this.staleSweepTimer);
      this.staleSweepTimer = null;
    }
  }

  private async requirePaid(userId: string) {
    await this.subscriptionAccess.assertPaidMember(userId);
  }

  async getConnectionForUser(userId: string, connectionId: string) {
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        userLow: { select: { id: true, isActive: true } },
        userHigh: { select: { id: true, isActive: true } },
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const isMember =
      connection.userLowId === userId || connection.userHighId === userId;
    if (!isMember) {
      throw new ForbiddenException('Not a member of this connection');
    }

    if (connection.endedAt) {
      throw new ForbiddenException('This connection has ended');
    }

    const otherUser =
      connection.userLowId === userId
        ? connection.userHigh
        : connection.userLow;

    if (!connection.userLow.isActive || !connection.userHigh.isActive) {
      throw new ForbiddenException('Connection is not active');
    }

    if (connection.privacyLevel < MIN_VIDEO_CALL_PRIVACY_LEVEL) {
      throw new ForbiddenException(
        `Video calls require privacy level ${MIN_VIDEO_CALL_PRIVACY_LEVEL} or higher`,
      );
    }

    return { connection, otherUserId: otherUser.id };
  }

  private async getCallForUser(userId: string, callId: string) {
    await this.requirePaid(userId);

    const call = await this.prisma.videoCall.findUnique({
      where: { id: callId },
      include: {
        connection: {
          select: {
            userLowId: true,
            userHighId: true,
            privacyLevel: true,
            endedAt: true,
            userLow: { select: { isActive: true } },
            userHigh: { select: { isActive: true } },
          },
        },
      },
    });

    if (!call) {
      throw new NotFoundException('Video call not found');
    }

    const { connection } = call;
    const isMember =
      connection.userLowId === userId || connection.userHighId === userId;
    if (!isMember) {
      throw new ForbiddenException('Not a member of this connection');
    }

    if (call.connection.endedAt) {
      throw new ForbiddenException('This connection has ended');
    }

    if (!connection.userLow.isActive || !connection.userHigh.isActive) {
      throw new ForbiddenException('Connection is not active');
    }

    if (connection.privacyLevel < MIN_VIDEO_CALL_PRIVACY_LEVEL) {
      throw new ForbiddenException(
        `Video calls require privacy level ${MIN_VIDEO_CALL_PRIVACY_LEVEL} or higher`,
      );
    }

    return call;
  }

  async getLiveKitStatus() {
    if (this.liveKitStatusCache) {
      return this.liveKitStatusCache;
    }
    this.liveKitStatusCache = { configured: this.livekit.isConfigured() };
    return this.liveKitStatusCache;
  }

  async getCall(userId: string, callId: string) {
    const cacheKey = `${userId}:${callId}`;
    const cached = this.callSnapshotCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const call = await this.getCallForUser(userId, callId);
    if (
      call.status === 'active' &&
      isVideoCallPastMaxDuration(call.startedAt ?? call.createdAt)
    ) {
      const completed = await this.completeActiveCall(call, 'duration_cap');
      const value = serializeCall(completed, userId);
      this.callSnapshotCache.set(cacheKey, {
        expiresAt: Date.now() + VideoCallsService.CALL_SNAPSHOT_CACHE_TTL_MS,
        value,
      });
      return value;
    }
    const value = serializeCall(call, userId);
    const ttl =
      call.status === 'ringing'
        ? VideoCallsService.CALL_SNAPSHOT_CACHE_TTL_MS
        : VideoCallsService.CALL_SNAPSHOT_ACTIVE_CACHE_TTL_MS;
    this.callSnapshotCache.set(cacheKey, {
      expiresAt: Date.now() + ttl,
      value,
    });
    return value;
  }

  async createCall(
    userId: string,
    connectionId: string,
    scheduledAt?: string | null,
  ) {
    await this.requirePaid(userId);
    await this.profilePause.assertCanSendConnectionActions(userId);
    const { connection, otherUserId } = await this.getConnectionForUser(
      userId,
      connectionId,
    );

    await this.releaseStaleCallOnConnection(connectionId);

    const existingActive = await this.prisma.videoCall.findFirst({
      where: {
        connectionId,
        status: { in: ['ringing', 'active'] },
      },
    });
    if (existingActive) {
      throw new BadRequestException(
        'An active or ringing call already exists for this connection',
      );
    }

    let parsedScheduled: Date | null = null;
    if (scheduledAt) {
      parsedScheduled = new Date(scheduledAt);
      if (Number.isNaN(parsedScheduled.getTime())) {
        throw new BadRequestException('Invalid scheduledAt');
      }
      if (parsedScheduled.getTime() <= Date.now()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
    }

    const call = await this.prisma.videoCall.create({
      data: {
        connectionId,
        initiatorId: userId,
        scheduledAt: parsedScheduled,
        status: parsedScheduled ? 'scheduled' : 'ringing',
      },
    });

    this.invalidateCallCaches(userId, connectionId, call.id, [otherUserId]);

    if (!parsedScheduled) {
      // Carried in data only, never in the visible text, so a locked handset
      // still shows nothing identifying while the app can name the caller
      // immediately instead of waiting for the alerts poll.
      const callerName = await this.resolveVisibleNameFor(
        userId,
        connection.privacyLevel,
      );
      void this.pushNotifications.sendToUser(otherUserId, {
        title: 'Incoming video call',
        body: 'A connection is calling you — tap to answer',
        channelId: PUSH_CHANNEL_CALLS,
        ...MEMBER_INCOMING_PUSH,
        data: {
          type: 'call',
          connectionId,
          callId: call.id,
          ...(callerName ? { callerName } : {}),
        },
      });
    } else {
      void this.notifyPartnerOfScheduledCall({
        partnerUserId: otherUserId,
        schedulerUserId: userId,
        connectionId,
        callId: call.id,
        privacyLevel: connection.privacyLevel,
        rescheduled: false,
      });
    }

    return serializeCall(call, userId);
  }

  private async resolveVisibleNameFor(userId: string, privacyLevel: number) {
    const [profile, fullNameRule] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { userId },
        select: { fullName: true },
      }),
      this.privacyFields.getFullNameRule(),
    ]);

    return resolveVisibleFullName(
      profile?.fullName ?? null,
      privacyLevel,
      fullNameRule,
    );
  }

  async listCalls(
    userId: string,
    connectionId: string,
    options?: { activeOnly?: boolean },
  ) {
    const cacheKey = `${userId}:${connectionId}:${options?.activeOnly ? 'active' : 'all'}`;
    const cached = this.listCallsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inflight = this.listCallsInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const request = this.fetchConnectionCalls(
      userId,
      connectionId,
      options,
    ).finally(() => {
      this.listCallsInflight.delete(cacheKey);
    });
    this.listCallsInflight.set(cacheKey, request);
    return request;
  }

  private async fetchConnectionCalls(
    userId: string,
    connectionId: string,
    options?: { activeOnly?: boolean },
  ) {
    const cacheKey = `${userId}:${connectionId}:${options?.activeOnly ? 'active' : 'all'}`;

    await this.requirePaid(userId);
    await this.assertConnectionVideoAccess(userId, connectionId);

    const calls = await this.prisma.videoCall.findMany({
      where: {
        connectionId,
        ...(options?.activeOnly
          ? {
              status: {
                in: ['scheduled', 'ringing', 'active'],
              },
            }
          : {}),
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: options?.activeOnly ? 10 : 30,
    });

    const value = calls.map((call) => serializeCall(call, userId));
    const ttl =
      options?.activeOnly && value.length === 0
        ? VideoCallsService.LIST_CALLS_EMPTY_CACHE_TTL_MS
        : VideoCallsService.LIST_CALLS_CACHE_TTL_MS;
    this.listCallsCache.set(cacheKey, {
      expiresAt: Date.now() + ttl,
      value,
    });
    return value;
  }

  private async assertConnectionVideoAccess(
    userId: string,
    connectionId: string,
  ) {
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        OR: [{ userLowId: userId }, { userHighId: userId }],
      },
      select: {
        privacyLevel: true,
        endedAt: true,
        userLow: { select: { isActive: true } },
        userHigh: { select: { isActive: true } },
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.endedAt) {
      throw new ForbiddenException('This connection has ended');
    }

    if (!connection.userLow.isActive || !connection.userHigh.isActive) {
      throw new ForbiddenException('Connection is not active');
    }

    if (connection.privacyLevel < MIN_VIDEO_CALL_PRIVACY_LEVEL) {
      throw new ForbiddenException(
        `Video calls require privacy level ${MIN_VIDEO_CALL_PRIVACY_LEVEL} or higher`,
      );
    }
  }

  async listIncoming(userId: string) {
    await this.requirePaid(userId);
    const connections = await this.prisma.connection.findMany({
      where: {
        endedAt: null,
        OR: [{ userLowId: userId }, { userHighId: userId }],
        privacyLevel: { gte: MIN_VIDEO_CALL_PRIVACY_LEVEL },
      },
      select: { id: true },
    });

    const connectionIds = connections.map((c) => c.id);
    if (connectionIds.length === 0) {
      return [];
    }

    const calls = await this.prisma.videoCall.findMany({
      where: {
        connectionId: { in: connectionIds },
        status: 'ringing',
        initiatorId: { not: userId },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return calls.map((call) => serializeCall(call, userId));
  }

  async listCallLog(userId: string) {
    await this.requirePaid(userId);

    const connections = await this.prisma.connection.findMany({
      where: {
        OR: [{ userLowId: userId }, { userHighId: userId }],
      },
      select: {
        id: true,
        endedAt: true,
        privacyLevel: true,
        userLowId: true,
        userHighId: true,
        userLow: {
          select: {
            isActive: true,
            profile: { select: { fullName: true, profileCode: true } },
          },
        },
        userHigh: {
          select: {
            isActive: true,
            profile: { select: { fullName: true, profileCode: true } },
          },
        },
      },
    });

    if (connections.length === 0) {
      return [];
    }

    const byId = new Map(
      connections.map((connection) => [connection.id, connection]),
    );
    const fullNameRule = await this.privacyFields.getFullNameRule();

    const calls = await this.prisma.videoCall.findMany({
      where: {
        connectionId: { in: [...byId.keys()] },
        status: { in: ['completed', 'cancelled', 'declined', 'missed'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return calls.map((call) => {
      const connection = byId.get(call.connectionId);
      const otherUser =
        connection?.userLowId === userId
          ? connection.userHigh
          : connection?.userLow;
      const partnerName = resolveVisibleFullName(
        otherUser?.profile?.fullName ?? null,
        connection?.privacyLevel ?? 1,
        fullNameRule,
      );
      const canCallBack = Boolean(
        connection &&
          !connection.endedAt &&
          connection.privacyLevel >= MIN_VIDEO_CALL_PRIVACY_LEVEL &&
          connection.userLow.isActive &&
          connection.userHigh.isActive,
      );

      return {
        ...serializeCall(call, userId),
        partnerName,
        partnerProfileCode: otherUser?.profile?.profileCode ?? null,
        canCallBack,
      };
    });
  }

  async listCallAlerts(userId: string): Promise<VideoCallAlert[]> {
    const cached = this.callAlertsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (
      cached &&
      cached.expiresAt + VideoCallsService.CALL_ALERTS_STALE_TTL_MS > Date.now()
    ) {
      void this.refreshCallAlerts(userId);
      return cached.value;
    }

    const inflight = this.callAlertsInflight.get(userId);
    if (inflight) {
      return inflight;
    }

    const request = this.loadCallAlerts(userId).finally(() => {
      this.callAlertsInflight.delete(userId);
    });
    this.callAlertsInflight.set(userId, request);
    return request;
  }

  private refreshCallAlerts(userId: string) {
    if (this.callAlertsInflight.has(userId)) {
      return;
    }
    const request = this.loadCallAlerts(userId).finally(() => {
      this.callAlertsInflight.delete(userId);
    });
    this.callAlertsInflight.set(userId, request);
    void request;
  }

  private async loadCallAlerts(userId: string): Promise<VideoCallAlert[]> {
    const storeAlerts = (alerts: VideoCallAlert[]) => {
      this.callAlertsCache.set(userId, {
        expiresAt: Date.now() + VideoCallsService.CALL_ALERTS_CACHE_TTL_MS,
        value: alerts,
      });
      return alerts;
    };

    if (!(await this.subscriptionAccess.isPaidMember(userId))) {
      return storeAlerts([]);
    }

    const now = Date.now();
    await this.sweepOverdueScheduledCalls(now);

    const connections = await this.prisma.connection.findMany({
      where: {
        endedAt: null,
        OR: [{ userLowId: userId }, { userHighId: userId }],
        privacyLevel: { gte: MIN_VIDEO_CALL_PRIVACY_LEVEL },
        userLow: { isActive: true },
        userHigh: { isActive: true },
      },
      select: { id: true },
    });

    const connectionIds = connections.map((c) => c.id);
    if (connectionIds.length === 0) {
      return storeAlerts([]);
    }

    const reminderHorizon = new Date(now + VIDEO_CALL_REMINDER_WINDOW_MS);
    const fullNameRule = await this.privacyFields.getFullNameRule();
    const scheduledNotBefore = new Date(now - VIDEO_CALL_OVERDUE_GRACE_MS);

    const calls = await this.prisma.videoCall.findMany({
      where: {
        connectionId: { in: connectionIds },
        OR: [
          { status: 'ringing', initiatorId: { not: userId } },
          {
            status: 'scheduled',
            scheduledAt: { gte: scheduledNotBefore },
          },
        ],
      },
      include: {
        initiator: {
          select: {
            id: true,
            profile: { select: { fullName: true } },
          },
        },
        connection: {
          select: {
            privacyLevel: true,
            userLowId: true,
            userHighId: true,
            userLow: {
              select: {
                id: true,
                profile: { select: { fullName: true } },
              },
            },
            userHigh: {
              select: {
                id: true,
                profile: { select: { fullName: true } },
              },
            },
          },
        },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    });

    const alerts: VideoCallAlert[] = [];

    for (const call of calls) {
      const serialized = serializeCall(call, userId);
      const otherUser =
        call.connection.userLowId === userId
          ? call.connection.userHigh
          : call.connection.userLow;
      const partnerName = resolveVisibleFullName(
        otherUser.profile?.fullName ?? null,
        call.connection.privacyLevel,
        fullNameRule,
      );

      if (call.status === 'ringing' && call.initiatorId !== userId) {
        alerts.push({
          kind: 'incoming',
          call: serialized,
          partnerName,
        });
        continue;
      }

      if (call.status !== 'scheduled' || !call.scheduledAt) {
        continue;
      }

      if (canJoinScheduledVideoCall(call.scheduledAt, now)) {
        alerts.push({
          kind: 'scheduled_starting',
          call: serialized,
          partnerName,
        });
        continue;
      }

      if (call.scheduledAt.getTime() <= now) {
        continue;
      }

      if (
        call.scheduledAt.getTime() <= reminderHorizon.getTime() &&
        isInVideoCallReminderWindow(call.scheduledAt, now)
      ) {
        alerts.push({
          kind: 'scheduled_reminder',
          call: serialized,
          partnerName,
        });
        continue;
      }

      if (call.initiatorId !== userId) {
        alerts.push({
          kind: 'scheduled_partner',
          call: serialized,
          partnerName,
        });
      }
    }

    const priority: Record<VideoCallAlertKind, number> = {
      incoming: 0,
      scheduled_starting: 1,
      scheduled_reminder: 2,
      scheduled_partner: 3,
    };

    const sortedAlerts = alerts.sort(
      (a, b) => priority[a.kind] - priority[b.kind],
    );
    return storeAlerts(sortedAlerts);
  }

  async sweepStaleCalls(now = Date.now()) {
    if (this.staleSweepRunning) return;
    if (now - this.staleSweepAt < VideoCallsService.OVERDUE_SWEEP_INTERVAL_MS) {
      return;
    }

    this.staleSweepAt = now;
    this.staleSweepRunning = true;
    try {
      await this.sweepOverdueScheduledCalls(now);
      await this.sweepExpiredActiveCalls(now);
      await this.sweepEmptyActiveCalls(now);
    } catch (err) {
      this.logger.warn(
        `Video call stale sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.staleSweepRunning = false;
    }
  }

  private async sweepOverdueScheduledCalls(now: number) {
    await this.prisma.videoCall.updateMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lt: new Date(now - VIDEO_CALL_OVERDUE_GRACE_MS),
        },
      },
      data: {
        status: 'missed',
        endedAt: new Date(),
      },
    });
  }

  private async sweepExpiredActiveCalls(now: number) {
    const cutoff = new Date(now - VIDEO_CALL_MAX_DURATION_MS);
    const expired = await this.prisma.videoCall.findMany({
      where: {
        status: 'active',
        OR: [
          { startedAt: { lte: cutoff } },
          { startedAt: null, createdAt: { lte: cutoff } },
        ],
      },
      select: {
        id: true,
        connectionId: true,
        initiatorId: true,
        status: true,
        startedAt: true,
        createdAt: true,
        connection: { select: { userLowId: true, userHighId: true } },
      },
    });

    for (const call of expired) {
      if (isVideoCallPastMaxDuration(call.startedAt ?? call.createdAt, now)) {
        await this.completeActiveCall(call, 'duration_cap');
      }
    }
  }

  private async sweepEmptyActiveCalls(now: number) {
    if (!this.livekit.isConfigured()) return;

    const cutoff = new Date(now - VIDEO_CALL_EMPTY_ROOM_GRACE_MS);
    const candidates = await this.prisma.videoCall.findMany({
      where: {
        status: 'active',
        OR: [
          { startedAt: { lte: cutoff } },
          { startedAt: null, createdAt: { lte: cutoff } },
        ],
      },
      select: {
        id: true,
        connectionId: true,
        initiatorId: true,
        status: true,
        startedAt: true,
        createdAt: true,
        connection: { select: { userLowId: true, userHighId: true } },
      },
    });
    if (candidates.length === 0) return;

    const existingRooms = await this.livekit.listExistingCallRoomNames();
    if (!existingRooms) return;

    for (const call of candidates) {
      if (existingRooms.has(this.livekit.roomName(call.id))) {
        continue;
      }
      await this.completeActiveCall(call, 'empty_room');
    }
  }

  private async releaseStaleCallOnConnection(connectionId: string) {
    const existing = await this.prisma.videoCall.findFirst({
      where: {
        connectionId,
        status: { in: ['ringing', 'active'] },
      },
      select: {
        id: true,
        connectionId: true,
        initiatorId: true,
        status: true,
        startedAt: true,
        createdAt: true,
        connection: { select: { userLowId: true, userHighId: true } },
      },
    });
    if (!existing || existing.status !== 'active') return;

    if (isVideoCallPastMaxDuration(existing.startedAt ?? existing.createdAt)) {
      await this.completeActiveCall(existing, 'duration_cap');
      return;
    }

    const started = existing.startedAt ?? existing.createdAt;
    if (started.getTime() > Date.now() - VIDEO_CALL_EMPTY_ROOM_GRACE_MS) {
      return;
    }
    if (!this.livekit.isConfigured()) return;

    const rooms = await this.livekit.listExistingCallRoomNames();
    if (!rooms) return;
    if (rooms.has(this.livekit.roomName(existing.id))) return;
    await this.completeActiveCall(existing, 'empty_room');
  }

  private async completeActiveCall(
    call: CallWithConnectionMembers,
    reason: 'duration_cap' | 'empty_room',
  ) {
    const updated = await this.prisma.videoCall.updateMany({
      where: { id: call.id, status: { in: ['ringing', 'active'] } },
      data: {
        status: 'completed',
        endedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      const current = await this.prisma.videoCall.findUniqueOrThrow({
        where: { id: call.id },
      });
      return current;
    }

    await this.expireCallGuests(call.id);
    void this.livekit.deleteRoom(call.id);
    const extraUserIds = call.connection
      ? [call.connection.userLowId, call.connection.userHighId]
      : [];
    this.invalidateCallCaches(
      call.initiatorId,
      call.connectionId,
      call.id,
      extraUserIds,
    );
    this.logger.log(
      `Ended video call ${call.id} (${reason === 'duration_cap' ? '60-minute limit' : 'empty room'})`,
    );

    return this.prisma.videoCall.findUniqueOrThrow({ where: { id: call.id } });
  }

  async prepareLiveKitJoin(call: {
    id: string;
    status: VideoCallStatus;
    startedAt: Date | null;
    createdAt: Date;
    connectionId: string;
    initiatorId: string;
    connection?: { userLowId: string; userHighId: string };
  }) {
    if (call.status !== 'active') {
      throw new BadRequestException('Call must be active to join the room');
    }

    if (isVideoCallPastMaxDuration(call.startedAt ?? call.createdAt)) {
      await this.completeActiveCall(call, 'duration_cap');
      throw new BadRequestException(
        'This call has reached the 60-minute limit',
      );
    }

    await this.livekit.ensureCallRoom(call.id);
    return {
      ttlSeconds: videoCallLiveKitTtlSeconds(call.startedAt ?? call.createdAt),
    };
  }

  async acceptCall(userId: string, callId: string) {
    const call = await this.getCallForUser(userId, callId);

    if (call.status !== 'ringing') {
      throw new BadRequestException('Call is not ringing');
    }

    const updated = await this.prisma.videoCall.update({
      where: { id: callId },
      data: {
        status: 'active',
        startedAt: new Date(),
      },
    });

    this.invalidateCallCaches(userId, call.connectionId, callId);
    return serializeCall(updated, userId);
  }

  async declineCall(userId: string, callId: string) {
    const call = await this.getCallForUser(userId, callId);

    if (call.status !== 'ringing') {
      throw new BadRequestException('Call is not ringing');
    }

    if (call.initiatorId === userId) {
      throw new BadRequestException('Initiator cannot decline their own call');
    }

    const updated = await this.prisma.videoCall.update({
      where: { id: callId },
      data: {
        status: 'declined',
        endedAt: new Date(),
      },
    });

    this.invalidateCallCaches(userId, call.connectionId, callId);
    return serializeCall(updated, userId);
  }

  async cancelCall(userId: string, callId: string) {
    const call = await this.getCallForUser(userId, callId);

    if (call.status === 'scheduled') {
      const updated = await this.prisma.videoCall.update({
        where: { id: callId },
        data: {
          status: 'cancelled',
          endedAt: new Date(),
        },
      });
      this.invalidateCallCaches(userId, call.connectionId, callId);
      return serializeCall(updated, userId);
    }

    if (call.status !== 'ringing') {
      throw new BadRequestException('Call cannot be cancelled');
    }

    if (call.initiatorId !== userId) {
      throw new BadRequestException(
        'Only the caller can cancel a ringing call; use decline instead',
      );
    }

    const updated = await this.prisma.videoCall.update({
      where: { id: callId },
      data: {
        status: 'cancelled',
        endedAt: new Date(),
      },
    });

    this.invalidateCallCaches(userId, call.connectionId, callId);
    return serializeCall(updated, userId);
  }

  async rescheduleCall(userId: string, callId: string, scheduledAt: string) {
    const call = await this.getCallForUser(userId, callId);

    if (call.status !== 'scheduled') {
      throw new BadRequestException('Only scheduled calls can be rescheduled');
    }

    const parsedScheduled = new Date(scheduledAt);
    if (Number.isNaN(parsedScheduled.getTime())) {
      throw new BadRequestException('Invalid scheduledAt');
    }
    if (parsedScheduled.getTime() <= Date.now()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const updated = await this.prisma.videoCall.update({
      where: { id: callId },
      data: { scheduledAt: parsedScheduled },
    });

    const otherUserId =
      call.connection.userLowId === userId
        ? call.connection.userHighId
        : call.connection.userLowId;
    this.invalidateCallCaches(userId, call.connectionId, callId, [otherUserId]);
    void this.notifyPartnerOfScheduledCall({
      partnerUserId: otherUserId,
      schedulerUserId: userId,
      connectionId: call.connectionId,
      callId,
      privacyLevel: call.connection.privacyLevel,
      rescheduled: true,
    });
    return serializeCall(updated, userId);
  }

  async startScheduledCall(userId: string, callId: string) {
    const call = await this.getCallForUser(userId, callId);

    if (call.status === 'ringing' && call.scheduledAt) {
      return serializeCall(call, userId);
    }

    if (call.status !== 'scheduled') {
      throw new BadRequestException('Call is not scheduled');
    }

    if (!call.scheduledAt) {
      throw new BadRequestException('Call has no scheduled time');
    }

    if (!canJoinScheduledVideoCall(call.scheduledAt)) {
      throw new BadRequestException(
        'Scheduled call can be joined from 15 minutes before until 1 hour after the scheduled time',
      );
    }

    await this.releaseStaleCallOnConnection(call.connectionId);

    const existingActive = await this.prisma.videoCall.findFirst({
      where: {
        connectionId: call.connectionId,
        status: { in: ['ringing', 'active'] },
        id: { not: callId },
      },
    });
    if (existingActive) {
      throw new BadRequestException(
        'Another call is already active for this connection',
      );
    }

    const updated = await this.prisma.videoCall.update({
      where: { id: callId },
      data: { status: 'ringing' },
    });

    this.invalidateCallCaches(userId, call.connectionId, callId);
    return serializeCall(updated, userId);
  }

  async endCall(userId: string, callId: string) {
    const call = await this.getCallForUser(userId, callId);

    if (call.status === 'completed') {
      return serializeCall(call, userId);
    }

    if (!['ringing', 'active'].includes(call.status)) {
      throw new BadRequestException('Call is not in progress');
    }

    const updated = await this.prisma.videoCall.update({
      where: { id: callId },
      data: {
        status: 'completed',
        endedAt: new Date(),
      },
    });

    await this.expireCallGuests(callId);
    void this.livekit.deleteRoom(callId);

    this.invalidateCallCaches(userId, call.connectionId, callId);
    return serializeCall(updated, userId);
  }

  async expireCallGuests(callId: string) {
    await this.prisma.videoCallGuest.updateMany({
      where: {
        videoCallId: callId,
        status: { in: ['pending_approval', 'approved', 'joined'] },
      },
      data: { status: 'expired' },
    });
  }

  async postSignal(
    userId: string,
    callId: string,
    type: 'offer' | 'answer' | 'ice',
    payload: Record<string, unknown>,
  ) {
    const call = await this.getCallForUser(userId, callId);

    if (call.status !== 'active') {
      throw new BadRequestException('Call is not active');
    }

    const signal = await this.prisma.videoCallSignal.create({
      data: {
        videoCallId: callId,
        senderId: userId,
        type,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    return {
      id: signal.id,
      type: signal.type,
      senderId: signal.senderId,
      createdAt: signal.createdAt.toISOString(),
    };
  }

  async pollSignals(userId: string, callId: string, after?: string) {
    await this.getCallForUser(userId, callId);

    const afterDate = after ? new Date(after) : null;
    if (after && Number.isNaN(afterDate!.getTime())) {
      throw new BadRequestException('Invalid after cursor');
    }

    const signals = await this.prisma.videoCallSignal.findMany({
      where: {
        videoCallId: callId,
        senderId: { not: userId },
        ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return signals.map((signal) => ({
      id: signal.id,
      type: signal.type,
      senderId: signal.senderId,
      payload: signal.payload,
      createdAt: signal.createdAt.toISOString(),
    }));
  }

  private async notifyPartnerOfScheduledCall(input: {
    partnerUserId: string;
    schedulerUserId: string;
    connectionId: string;
    callId: string;
    privacyLevel: number;
    rescheduled: boolean;
  }) {
    try {
      const callerName = await this.resolveVisibleNameFor(
        input.schedulerUserId,
        input.privacyLevel,
      );
      await this.pushNotifications.sendToUser(input.partnerUserId, {
        title: input.rescheduled
          ? 'Video call rescheduled'
          : 'Video call scheduled',
        body: input.rescheduled
          ? 'A connection changed the time of a video call with you'
          : 'A connection scheduled a video call with you',
        channelId: PUSH_CHANNEL_ACTIVITY,
        ...MEMBER_INCOMING_PUSH,
        data: {
          type: 'scheduled_call',
          connectionId: input.connectionId,
          callId: input.callId,
          ...(callerName ? { callerName } : {}),
        },
      });
    } catch {
      // Push delivery must not block scheduling.
    }
  }

  invalidateUserCallCaches(userId: string) {
    this.callAlertsCache.delete(userId);
    this.callAlertsInflight.delete(userId);
    invalidateAlertsSummaryCache(userId);
    for (const key of this.listCallsCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.listCallsCache.delete(key);
      }
    }
    for (const key of this.callSnapshotCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.callSnapshotCache.delete(key);
      }
    }
  }

  private invalidateCallCaches(
    userId: string,
    connectionId: string,
    callId?: string,
    alsoInvalidateUserIds: string[] = [],
  ) {
    const userIds = new Set([userId, ...alsoInvalidateUserIds]);
    for (const uid of userIds) {
      this.callAlertsCache.delete(uid);
      this.callAlertsInflight.delete(uid);
      invalidateAlertsSummaryCache(uid);
      for (const key of this.listCallsCache.keys()) {
        if (key.startsWith(`${uid}:${connectionId}:`)) {
          this.listCallsCache.delete(key);
        }
      }
      if (callId) {
        this.callSnapshotCache.delete(`${uid}:${callId}`);
      }
    }

    void this.prisma.connection
      .findUnique({
        where: { id: connectionId },
        select: { userLowId: true, userHighId: true },
      })
      .then((connection) => {
        if (!connection) return;
        for (const uid of [connection.userLowId, connection.userHighId]) {
          this.callAlertsCache.delete(uid);
          this.callAlertsInflight.delete(uid);
          invalidateAlertsSummaryCache(uid);
        }
      });
  }
}
