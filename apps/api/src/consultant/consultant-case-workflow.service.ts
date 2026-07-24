import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, isStaffRole } from '@easymatch/shared';
import {
  ConsultantEngagementStatus,
  ConsultantMeetingStatus,
  Prisma,
  VideoCallStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LiveKitService } from '../discovery/livekit.service';

type CaseAccess = {
  engagement: {
    id: string;
    connectionId: string;
    assignedConsultantId: string | null;
    status: ConsultantEngagementStatus;
    connection: {
      userLowId: string;
      userHighId: string;
      privacyLevel: number;
    };
  };
  isConsultant: boolean;
  isMember: boolean;
};

@Injectable()
export class ConsultantCaseWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly livekit: LiveKitService,
  ) {}

  private async getCaseAccess(
    userId: string,
    role: string,
    engagementId: string,
  ): Promise<CaseAccess> {
    const engagement = await this.prisma.consultantEngagement.findUnique({
      where: { id: engagementId },
      include: {
        connection: {
          select: {
            userLowId: true,
            userHighId: true,
            privacyLevel: true,
          },
        },
      },
    });

    if (!engagement) {
      throw new NotFoundException('Consultant case not found');
    }

    const isMember =
      engagement.connection.userLowId === userId ||
      engagement.connection.userHighId === userId;
    const isConsultant =
      role === UserRole.MARRIAGE_CONSULTANT || role === UserRole.SUPER_ADMIN;

    if (!isMember && !isConsultant) {
      throw new ForbiddenException('Not allowed to access this case');
    }

    return {
      engagement: {
        id: engagement.id,
        connectionId: engagement.connectionId,
        assignedConsultantId: engagement.assignedConsultantId,
        status: engagement.status,
        connection: engagement.connection,
      },
      isConsultant,
      isMember,
    };
  }

  private assertAssignedConsultant(
    access: CaseAccess,
    userId: string,
    role: string,
  ) {
    if (role === UserRole.SUPER_ADMIN) return;
    if (!access.isConsultant) {
      throw new ForbiddenException('Consultant access required');
    }
    if (access.engagement.assignedConsultantId !== userId) {
      throw new ForbiddenException('Assign yourself to this case first');
    }
  }

  private messageInclude = {
    sender: {
      select: {
        id: true,
        role: true,
        profile: { select: { fullName: true, profileCode: true } },
      },
    },
    recipient: {
      select: {
        id: true,
        profile: { select: { fullName: true, profileCode: true } },
      },
    },
  } satisfies Prisma.ConsultantCaseMessageInclude;

  private toMessageDto(
    row: {
      id: string;
      body: string;
      createdAt: Date;
      senderId: string;
      recipientId: string | null;
      sender: {
        id: string;
        role: string;
        profile: { fullName: string | null; profileCode: string | null } | null;
      };
      recipient: {
        id: string;
        profile: { fullName: string | null; profileCode: string | null } | null;
      } | null;
    },
    viewerId: string,
  ) {
    const recipientDisplay =
      row.recipient?.profile?.fullName ??
      row.recipient?.profile?.profileCode ??
      null;

    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      audience: row.recipientId ? ('member' as const) : ('both' as const),
      recipient: row.recipientId
        ? {
            id: row.recipientId,
            displayName: recipientDisplay ?? 'Member',
          }
        : null,
      sender: {
        id: row.sender.id,
        role: row.sender.role,
        isConsultant: isStaffRole(row.sender.role),
        displayName:
          row.sender.profile?.fullName ??
          row.sender.profile?.profileCode ??
          (isStaffRole(row.sender.role) ? 'Marriage consultant' : 'Member'),
      },
      isMine: row.senderId === viewerId,
    };
  }

  private assertConnectionMemberRecipient(
    access: CaseAccess,
    recipientId: string,
  ) {
    const { userLowId, userHighId } = access.engagement.connection;
    if (recipientId !== userLowId && recipientId !== userHighId) {
      throw new BadRequestException('Recipient must be a member of this connection');
    }
  }

  async getCaseDetail(userId: string, role: string, engagementId: string) {
    const access = await this.getCaseAccess(userId, role, engagementId);
    const row = await this.prisma.consultantEngagement.findUniqueOrThrow({
      where: { id: engagementId },
      include: {
        requestedBy: {
          select: {
            profile: { select: { fullName: true, profileCode: true } },
          },
        },
        connection: {
          select: {
            privacyLevel: true,
            userLow: {
              select: {
                id: true,
                profile: { select: { fullName: true, profileCode: true } },
              },
            },
            userHigh: {
              select: {
                id: true,
                profile: { select: { fullName: true, profileCode: true } },
              },
            },
          },
        },
        linkedVideoCall: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
          },
        },
      },
    });

    return {
      id: row.id,
      connectionId: row.connectionId,
      serviceType: row.serviceType,
      serviceLabelEn: row.serviceLabelEn,
      amountBdt: row.amountBdt.toFixed(2),
      status: row.status,
      assignedConsultantId: row.assignedConsultantId,
      memberNotes: row.memberNotes,
      createdAt: row.createdAt.toISOString(),
      requester: {
        fullName: row.requestedBy.profile?.fullName ?? null,
        profileCode: row.requestedBy.profile?.profileCode ?? null,
      },
      connection: {
        privacyLevel: row.connection.privacyLevel,
        memberLow: {
          userId: row.connection.userLow.id,
          fullName: row.connection.userLow.profile?.fullName ?? null,
          profileCode: row.connection.userLow.profile?.profileCode ?? null,
        },
        memberHigh: {
          userId: row.connection.userHigh.id,
          fullName: row.connection.userHigh.profile?.fullName ?? null,
          profileCode: row.connection.userHigh.profile?.profileCode ?? null,
        },
      },
      linkedVideoCall: row.linkedVideoCall
        ? {
            id: row.linkedVideoCall.id,
            status: row.linkedVideoCall.status,
            scheduledAt: row.linkedVideoCall.scheduledAt?.toISOString() ?? null,
          }
        : null,
      viewerIsConsultant: access.isConsultant,
      viewerIsMember: access.isMember,
    };
  }

  async listMessages(userId: string, role: string, engagementId: string) {
    const access = await this.getCaseAccess(userId, role, engagementId);

    const where: Prisma.ConsultantCaseMessageWhereInput = { engagementId };
    if (!access.isConsultant) {
      where.OR = [
        { recipientId: null },
        { recipientId: userId },
        { senderId: userId },
      ];
    }

    const rows = await this.prisma.consultantCaseMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: this.messageInclude,
    });

    return rows.map((row) => this.toMessageDto(row, userId));
  }

  async sendMessage(
    userId: string,
    role: string,
    engagementId: string,
    body: string,
    recipientId?: string | null,
  ) {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty');
    }
    if (trimmed.length > 4000) {
      throw new BadRequestException('Message is too long');
    }

    const access = await this.getCaseAccess(userId, role, engagementId);

    if (access.isConsultant) {
      this.assertAssignedConsultant(access, userId, role);
    }

    let resolvedRecipientId: string | null = null;
    if (recipientId?.trim()) {
      if (!access.isConsultant) {
        throw new ForbiddenException(
          'Only the consultant can send private messages to one member',
        );
      }
      this.assertConnectionMemberRecipient(access, recipientId.trim());
      resolvedRecipientId = recipientId.trim();
    }

    if (
      access.engagement.status === ConsultantEngagementStatus.cancelled ||
      access.engagement.status === ConsultantEngagementStatus.completed
    ) {
      throw new BadRequestException('This case is closed');
    }

    const row = await this.prisma.consultantCaseMessage.create({
      data: {
        engagementId,
        senderId: userId,
        recipientId: resolvedRecipientId,
        body: trimmed,
      },
      include: this.messageInclude,
    });

    return this.toMessageDto(row, userId);
  }

  async listDiary(userId: string, role: string, engagementId: string) {
    const access = await this.getCaseAccess(userId, role, engagementId);
    this.assertAssignedConsultant(access, userId, role);

    const rows = await this.prisma.consultantCaseDiaryEntry.findMany({
      where: { engagementId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async createDiaryEntry(
    userId: string,
    role: string,
    engagementId: string,
    body: string,
  ) {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException('Diary entry cannot be empty');
    }

    const access = await this.getCaseAccess(userId, role, engagementId);
    this.assertAssignedConsultant(access, userId, role);

    const row = await this.prisma.consultantCaseDiaryEntry.create({
      data: {
        engagementId,
        authorId: userId,
        body: trimmed,
      },
    });

    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateDiaryEntry(
    userId: string,
    role: string,
    engagementId: string,
    entryId: string,
    body: string,
  ) {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException('Diary entry cannot be empty');
    }

    const access = await this.getCaseAccess(userId, role, engagementId);
    this.assertAssignedConsultant(access, userId, role);

    const existing = await this.prisma.consultantCaseDiaryEntry.findFirst({
      where: { id: entryId, engagementId },
    });
    if (!existing) {
      throw new NotFoundException('Diary entry not found');
    }

    const row = await this.prisma.consultantCaseDiaryEntry.update({
      where: { id: entryId },
      data: { body: trimmed },
    });

    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async deleteDiaryEntry(
    userId: string,
    role: string,
    engagementId: string,
    entryId: string,
  ) {
    const access = await this.getCaseAccess(userId, role, engagementId);
    this.assertAssignedConsultant(access, userId, role);

    const existing = await this.prisma.consultantCaseDiaryEntry.findFirst({
      where: { id: entryId, engagementId },
    });
    if (!existing) {
      throw new NotFoundException('Diary entry not found');
    }

    await this.prisma.consultantCaseDiaryEntry.delete({ where: { id: entryId } });
    return { ok: true };
  }

  async listMeetings(userId: string, role: string, engagementId: string) {
    await this.getCaseAccess(userId, role, engagementId);

    const rows = await this.prisma.consultantMeeting.findMany({
      where: { engagementId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        videoCall: {
          select: { id: true, status: true, scheduledAt: true },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      scheduledAt: row.scheduledAt.toISOString(),
      agenda: row.agenda,
      status: row.status,
      videoCall: row.videoCall
        ? {
            id: row.videoCall.id,
            status: row.videoCall.status,
            scheduledAt: row.videoCall.scheduledAt?.toISOString() ?? null,
          }
        : null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async scheduleMeeting(
    userId: string,
    role: string,
    engagementId: string,
    input: {
      scheduledAt: string;
      agenda?: string;
      includeVideoCall?: boolean;
    },
  ) {
    const access = await this.getCaseAccess(userId, role, engagementId);
    this.assertAssignedConsultant(access, userId, role);

    const scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduledAt');
    }
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Meeting must be scheduled in the future');
    }

    const { connectionId } = access.engagement;
    const privacyLevel = access.engagement.connection.privacyLevel;
    if (input.includeVideoCall && privacyLevel < 2) {
      throw new BadRequestException(
        'Video meetings require connection privacy level 2 or higher',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let videoCallId: string | null = null;

      if (input.includeVideoCall) {
        const call = await tx.videoCall.create({
          data: {
            connectionId,
            initiatorId: userId,
            scheduledAt,
            status: VideoCallStatus.scheduled,
            consultantEngagementId: engagementId,
          },
        });
        videoCallId = call.id;
      }

      const meeting = await tx.consultantMeeting.create({
        data: {
          engagementId,
          scheduledAt,
          agenda: input.agenda?.trim() || null,
          videoCallId,
          createdById: userId,
          status: ConsultantMeetingStatus.scheduled,
        },
        include: {
          videoCall: {
            select: { id: true, status: true, scheduledAt: true },
          },
        },
      });

      return {
        id: meeting.id,
        scheduledAt: meeting.scheduledAt.toISOString(),
        agenda: meeting.agenda,
        status: meeting.status,
        videoCall: meeting.videoCall
          ? {
              id: meeting.videoCall.id,
              status: meeting.videoCall.status,
              scheduledAt:
                meeting.videoCall.scheduledAt?.toISOString() ?? null,
            }
          : null,
        createdAt: meeting.createdAt.toISOString(),
      };
    });
  }

  async cancelMeeting(
    userId: string,
    role: string,
    engagementId: string,
    meetingId: string,
  ) {
    const access = await this.getCaseAccess(userId, role, engagementId);
    this.assertAssignedConsultant(access, userId, role);

    const meeting = await this.prisma.consultantMeeting.findFirst({
      where: { id: meetingId, engagementId },
      include: { videoCall: true },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    if (meeting.status !== ConsultantMeetingStatus.scheduled) {
      throw new BadRequestException('Only scheduled meetings can be cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      if (meeting.videoCallId && meeting.videoCall) {
        await tx.videoCall.update({
          where: { id: meeting.videoCallId },
          data: {
            status: VideoCallStatus.cancelled,
            consultantEngagementId: null,
          },
        });
      }
      await tx.consultantMeeting.update({
        where: { id: meetingId },
        data: { status: ConsultantMeetingStatus.cancelled },
      });
    });

    return { ok: true };
  }

  async linkVideoCall(
    userId: string,
    role: string,
    engagementId: string,
    callId: string,
  ) {
    const access = await this.getCaseAccess(userId, role, engagementId);

    if (access.isConsultant) {
      this.assertAssignedConsultant(access, userId, role);
    }

    const call = await this.prisma.videoCall.findUnique({
      where: { id: callId },
    });
    if (!call || call.connectionId !== access.engagement.connectionId) {
      throw new NotFoundException('Video call not found for this connection');
    }
    if (
      call.status !== VideoCallStatus.scheduled &&
      call.status !== VideoCallStatus.ringing &&
      call.status !== VideoCallStatus.active
    ) {
      throw new BadRequestException('This call cannot include a consultant');
    }

    const updated = await this.prisma.videoCall.update({
      where: { id: callId },
      data: { consultantEngagementId: engagementId },
    });

    return {
      id: updated.id,
      status: updated.status,
      scheduledAt: updated.scheduledAt?.toISOString() ?? null,
      consultantEngagementId: updated.consultantEngagementId,
    };
  }

  async getConsultantLiveKitToken(userId: string, role: string, callId: string) {
    if (role !== UserRole.MARRIAGE_CONSULTANT && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Consultant access required');
    }

    if (!this.livekit.isConfigured()) {
      throw new BadRequestException('LiveKit is not configured');
    }

    const call = await this.prisma.videoCall.findUnique({
      where: { id: callId },
      include: {
        consultantEngagement: {
          select: { assignedConsultantId: true, status: true },
        },
      },
    });

    if (!call?.consultantEngagementId || !call.consultantEngagement) {
      throw new ForbiddenException('Consultant is not included in this call');
    }

    if (
      call.consultantEngagement.assignedConsultantId !== userId &&
      role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('You are not assigned to this case');
    }

    const token = await this.livekit.createParticipantToken({
      callId: call.id,
      identity: `consultant-${userId}`,
      name: 'Marriage consultant',
    });

    return {
      token,
      url: this.livekit.url!,
      roomName: this.livekit.roomName(call.id),
      callId: call.id,
    };
  }
}
