import {
  MAX_VIDEO_CALL_GUESTS_PER_SIDE,
  MIN_VIDEO_CALL_PRIVACY_LEVEL,
  VIDEO_CALL_GUEST_INVITE_TTL_HOURS,
} from '@easymatch/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoCallGuestStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LiveKitService } from './livekit.service';
import { VideoCallsService } from './video-calls.service';

function serializeGuest(
  guest: {
    id: string;
    videoCallId: string;
    invitedById: string;
    guestName: string;
    relation: string | null;
    token: string;
    status: VideoCallGuestStatus;
    approvedByUserLow: boolean;
    approvedByUserHigh: boolean;
    joinedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  },
  options?: {
    inviteUrl?: string;
    viewerId?: string;
    isUserLow?: boolean;
    isUserHigh?: boolean;
  },
) {
  const viewerId = options?.viewerId;
  const needsMyApproval =
    guest.status === 'pending_approval' &&
    viewerId != null &&
    guest.invitedById !== viewerId &&
    ((options?.isUserLow && !guest.approvedByUserLow) ||
      (options?.isUserHigh && !guest.approvedByUserHigh));

  return {
    id: guest.id,
    videoCallId: guest.videoCallId,
    invitedById: guest.invitedById,
    guestName: guest.guestName,
    relation: guest.relation,
    status: guest.status,
    approvedByUserLow: guest.approvedByUserLow,
    approvedByUserHigh: guest.approvedByUserHigh,
    joinedAt: guest.joinedAt?.toISOString() ?? null,
    expiresAt: guest.expiresAt.toISOString(),
    createdAt: guest.createdAt.toISOString(),
    updatedAt: guest.updatedAt.toISOString(),
    inviteUrl: options?.inviteUrl,
    canRevoke: viewerId != null && guest.invitedById === viewerId,
    needsMyApproval: Boolean(needsMyApproval),
  };
}

@Injectable()
export class VideoCallGuestsService {
  private readonly guestsCache = new Map<
    string,
    { expiresAt: number; value: ReturnType<typeof serializeGuest>[] }
  >();
  private static readonly GUESTS_CACHE_TTL_MS = 15_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoCalls: VideoCallsService,
    private readonly livekit: LiveKitService,
    private readonly config: ConfigService,
  ) {}

  private webPublicUrl(): string {
    return (
      this.config.get<string>('WEB_PUBLIC_URL') ??
      this.config.get<string>('CORS_ORIGIN') ??
      'http://localhost:4100'
    );
  }

  private guestInvitePath(token: string): string {
    return `/en/video/guest/${token}`;
  }

  private async getConnectionContext(userId: string, callId: string) {
    const call = await this.prisma.videoCall.findUnique({
      where: { id: callId },
      include: {
        connection: {
          select: {
            id: true,
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

    const isUserLow = connection.userLowId === userId;
    const isUserHigh = connection.userHighId === userId;

    return { call, isUserLow, isUserHigh };
  }

  private activeGuestStatuses(): VideoCallGuestStatus[] {
    return ['pending_approval', 'approved', 'joined'];
  }

  private async countGuestsForSide(
    callId: string,
    invitedById: string,
  ): Promise<number> {
    return this.prisma.videoCallGuest.count({
      where: {
        videoCallId: callId,
        invitedById,
        status: { in: this.activeGuestStatuses() },
      },
    });
  }

  async listGuests(userId: string, callId: string) {
    const cacheKey = `${userId}:${callId}`;
    const cached = this.guestsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const { call, isUserLow, isUserHigh } =
      await this.getConnectionContext(userId, callId);

    const guests = await this.prisma.videoCallGuest.findMany({
      where: { videoCallId: call.id },
      orderBy: { createdAt: 'asc' },
    });

    const baseUrl = this.webPublicUrl();
    const value = guests.map((guest) =>
      serializeGuest(guest, {
        inviteUrl: `${baseUrl}${this.guestInvitePath(guest.token)}`,
        viewerId: userId,
        isUserLow,
        isUserHigh,
      }),
    );
    this.guestsCache.set(cacheKey, {
      expiresAt: Date.now() + VideoCallGuestsService.GUESTS_CACHE_TTL_MS,
      value,
    });
    return value;
  }

  clearGuestsCache(callId?: string) {
    if (!callId) {
      this.guestsCache.clear();
      return;
    }
    for (const key of this.guestsCache.keys()) {
      if (key.endsWith(`:${callId}`)) {
        this.guestsCache.delete(key);
      }
    }
  }

  async inviteGuest(
    userId: string,
    callId: string,
    guestName: string,
    relation?: string,
  ) {
    if (!this.livekit.isConfigured()) {
      throw new ServiceUnavailableException(
        'Family guest invites require LiveKit (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)',
      );
    }

    const trimmedName = guestName.trim();
    if (!trimmedName) {
      throw new BadRequestException('Guest name is required');
    }

    const { call, isUserLow, isUserHigh } =
      await this.getConnectionContext(userId, callId);

    if (!['ringing', 'active', 'scheduled'].includes(call.status)) {
      throw new BadRequestException(
        'Guests can only be invited while the call is scheduled or in progress',
      );
    }

    const sideCount = await this.countGuestsForSide(call.id, userId);
    if (sideCount >= MAX_VIDEO_CALL_GUESTS_PER_SIDE) {
      throw new BadRequestException(
        `You can invite at most ${MAX_VIDEO_CALL_GUESTS_PER_SIDE} guests per call`,
      );
    }

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(
      Date.now() + VIDEO_CALL_GUEST_INVITE_TTL_HOURS * 60 * 60 * 1000,
    );

    const guest = await this.prisma.videoCallGuest.create({
      data: {
        videoCallId: call.id,
        invitedById: userId,
        guestName: trimmedName,
        relation: relation?.trim() || null,
        token,
        expiresAt,
        approvedByUserLow: true,
        approvedByUserHigh: true,
        status: 'approved',
      },
    });

    const updated = guest;

    const baseUrl = this.webPublicUrl();
    this.clearGuestsCache(call.id);
    return serializeGuest(updated, {
      inviteUrl: `${baseUrl}${this.guestInvitePath(updated.token)}`,
      viewerId: userId,
      isUserLow,
      isUserHigh,
    });
  }

  async approveGuest(userId: string, callId: string, guestId: string) {
    const { call, isUserLow, isUserHigh } =
      await this.getConnectionContext(userId, callId);

    const guest = await this.prisma.videoCallGuest.findFirst({
      where: { id: guestId, videoCallId: call.id },
    });

    if (!guest) {
      throw new NotFoundException('Guest invite not found');
    }

    if (guest.status !== 'pending_approval') {
      throw new BadRequestException('Guest invite is not awaiting approval');
    }

    if (guest.invitedById === userId) {
      throw new BadRequestException(
        'The inviting member is already approved on their side; the other member must approve',
      );
    }

    const data: {
      approvedByUserLow?: boolean;
      approvedByUserHigh?: boolean;
      status?: VideoCallGuestStatus;
    } = {};

    if (isUserLow) data.approvedByUserLow = true;
    if (isUserHigh) data.approvedByUserHigh = true;

    const nextLow = isUserLow ? true : guest.approvedByUserLow;
    const nextHigh = isUserHigh ? true : guest.approvedByUserHigh;
    if (nextLow && nextHigh) {
      data.status = 'approved';
    }

    const updated = await this.prisma.videoCallGuest.update({
      where: { id: guest.id },
      data,
    });

    const baseUrl = this.webPublicUrl();
    this.clearGuestsCache(call.id);
    return serializeGuest(updated, {
      inviteUrl: `${baseUrl}${this.guestInvitePath(updated.token)}`,
      viewerId: userId,
      isUserLow,
      isUserHigh,
    });
  }

  async declineGuest(userId: string, callId: string, guestId: string) {
    const { call } = await this.getConnectionContext(userId, callId);

    const guest = await this.prisma.videoCallGuest.findFirst({
      where: { id: guestId, videoCallId: call.id },
    });

    if (!guest) {
      throw new NotFoundException('Guest invite not found');
    }

    if (guest.invitedById === userId) {
      throw new BadRequestException('Use revoke to cancel your own invite');
    }

    if (!['pending_approval', 'approved'].includes(guest.status)) {
      throw new BadRequestException('Guest invite cannot be declined');
    }

    const updated = await this.prisma.videoCallGuest.update({
      where: { id: guest.id },
      data: { status: 'declined' },
    });

    this.clearGuestsCache(call.id);
    return serializeGuest(updated, { viewerId: userId });
  }

  async revokeGuest(userId: string, callId: string, guestId: string) {
    const { call } = await this.getConnectionContext(userId, callId);

    const guest = await this.prisma.videoCallGuest.findFirst({
      where: { id: guestId, videoCallId: call.id },
    });

    if (!guest) {
      throw new NotFoundException('Guest invite not found');
    }

    if (guest.invitedById !== userId) {
      throw new ForbiddenException('Only the inviting member can revoke this invite');
    }

    const updated = await this.prisma.videoCallGuest.update({
      where: { id: guest.id },
      data: { status: 'declined' },
    });

    this.clearGuestsCache(call.id);
    return serializeGuest(updated, { viewerId: userId });
  }

  async getMemberLiveKitToken(userId: string, callId: string) {
    if (!this.livekit.isConfigured()) {
      return { configured: false as const };
    }

    const { call } = await this.getConnectionContext(userId, callId);

    if (call.status !== 'active') {
      throw new BadRequestException('Call must be active to join the room');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { fullName: true },
    });

    const token = await this.livekit.createParticipantToken({
      callId: call.id,
      identity: userId,
      name: profile?.fullName?.trim() || 'Member',
    });

    return {
      configured: true as const,
      url: this.livekit.url!,
      token,
      roomName: this.livekit.roomName(call.id),
    };
  }

  private async getGuestByToken(token: string) {
    const guest = await this.prisma.videoCallGuest.findUnique({
      where: { token },
      include: {
        videoCall: {
          select: {
            id: true,
            status: true,
            connectionId: true,
          },
        },
      },
    });

    if (!guest) {
      throw new NotFoundException('Guest invite not found');
    }

    if (guest.expiresAt.getTime() < Date.now()) {
      if (guest.status !== 'expired') {
        await this.prisma.videoCallGuest.update({
          where: { id: guest.id },
          data: { status: 'expired' },
        });
      }
      throw new BadRequestException('Guest invite has expired');
    }

    return guest;
  }

  async getGuestLobby(token: string) {
    const guest = await this.getGuestByToken(token);

    return {
      guestName: guest.guestName,
      relation: guest.relation,
      status: guest.status,
      callStatus: guest.videoCall.status,
      livekitConfigured: this.livekit.isConfigured(),
      approvedByUserLow: guest.approvedByUserLow,
      approvedByUserHigh: guest.approvedByUserHigh,
      expiresAt: guest.expiresAt.toISOString(),
    };
  }

  async getGuestLiveKitToken(token: string) {
    if (!this.livekit.isConfigured()) {
      throw new ServiceUnavailableException(
        'Video calls with guests are not available on this server',
      );
    }

    const guest = await this.getGuestByToken(token);

    if (guest.status !== 'approved' && guest.status !== 'joined') {
      throw new ForbiddenException(
        'This invite is no longer available. Ask the member to send a new link.',
      );
    }

    if (guest.videoCall.status !== 'active') {
      throw new BadRequestException(
        'The call is not active yet. Please wait until both members are connected.',
      );
    }

    if (guest.status === 'approved') {
      await this.prisma.videoCallGuest.update({
        where: { id: guest.id },
        data: { status: 'joined', joinedAt: new Date() },
      });
    }

    const jwt = await this.livekit.createParticipantToken({
      callId: guest.videoCall.id,
      identity: `guest-${guest.id}`,
      name: guest.guestName,
    });

    return {
      url: this.livekit.url!,
      token: jwt,
      roomName: this.livekit.roomName(guest.videoCall.id),
      guestName: guest.guestName,
    };
  }

  async expireGuestsForCall(callId: string) {
    await this.videoCalls.expireCallGuests(callId);
  }
}
