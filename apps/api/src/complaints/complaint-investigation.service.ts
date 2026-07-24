import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { ConnectionMessageType, MemberComplaintStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MemberComplaintsService } from './member-complaints.service';

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

@Injectable()
export class ComplaintInvestigationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly complaints: MemberComplaintsService,
  ) {}

  private canonicalPair(userAId: string, userBId: string): [string, string] {
    return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  }

  private isInvestigatorRole(role: string) {
    return role === UserRole.MARRIAGE_CONSULTANT || role === UserRole.SUPER_ADMIN;
  }

  async assertInvestigatorAccess(
    userId: string,
    role: string,
    complaintId: string,
  ) {
    if (!this.isInvestigatorRole(role)) {
      throw new ForbiddenException('Investigator access required');
    }

    const complaint = await this.prisma.memberComplaint.findUnique({
      where: { id: complaintId },
      select: {
        id: true,
        status: true,
        assignedConsultantId: true,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    if (role === UserRole.SUPER_ADMIN) {
      return complaint;
    }

    if (complaint.assignedConsultantId !== userId) {
      throw new ForbiddenException(
        'Assign yourself to this complaint before viewing member chat history',
      );
    }

    if (
      complaint.status === MemberComplaintStatus.resolved ||
      complaint.status === MemberComplaintStatus.dismissed ||
      complaint.status === MemberComplaintStatus.cancelled
    ) {
      // Closed complaints remain readable for follow-up review.
    }

    return complaint;
  }

  async getChatHistory(userId: string, role: string, complaintId: string) {
    await this.assertInvestigatorAccess(userId, role, complaintId);

    const complaint = await this.prisma.memberComplaint.findUnique({
      where: { id: complaintId },
      include: {
        reporter: {
          select: {
            id: true,
            profile: { select: { profileCode: true, fullName: true } },
          },
        },
        targetProfile: {
          select: {
            userId: true,
            profileCode: true,
            fullName: true,
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    const reporterId = complaint.reporterId;
    const targetUserId = complaint.targetProfile.userId;
    const [userLowId, userHighId] = this.canonicalPair(reporterId, targetUserId);

    const [connection, interests] = await Promise.all([
      this.prisma.connection.findUnique({
        where: { userLowId_userHighId: { userLowId, userHighId } },
        select: { id: true, privacyLevel: true, createdAt: true },
      }),
      this.prisma.interest.findMany({
        where: {
          OR: [
            { senderId: reporterId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: reporterId },
          ],
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          senderId: true,
          status: true,
          createdAt: true,
          respondedAt: true,
        },
      }),
    ]);

    const reporter = {
      userId: reporterId,
      profileCode: complaint.reporter.profile?.profileCode ?? null,
      fullName: complaint.reporter.profile?.fullName ?? null,
    };
    const target = {
      userId: targetUserId,
      profileCode: complaint.targetProfile.profileCode,
      fullName: complaint.targetProfile.fullName,
    };

    if (!connection) {
      return {
        hasConnection: false,
        connectionId: null,
        privacyLevel: null,
        connectionCreatedAt: null,
        reporter,
        target,
        messages: [],
        interests: interests.map((row) => this.serializeInterest(row, reporterId)),
        messageCount: 0,
      };
    }

    const messages = await this.prisma.connectionMessage.findMany({
      where: { connectionId: connection.id },
      orderBy: { createdAt: 'asc' },
      select: messageSelect,
    });

    return {
      hasConnection: true,
      connectionId: connection.id,
      privacyLevel: connection.privacyLevel,
      connectionCreatedAt: connection.createdAt.toISOString(),
      reporter,
      target,
      messages: messages.map((message) =>
        this.serializeMessage(message, reporterId, targetUserId),
      ),
      interests: interests.map((row) => this.serializeInterest(row, reporterId)),
      messageCount: messages.length,
    };
  }

  private serializeInterest(
    row: {
      id: string;
      senderId: string;
      status: string;
      createdAt: Date;
      respondedAt: Date | null;
    },
    reporterId: string,
  ) {
    return {
      id: row.id,
      from: row.senderId === reporterId ? 'reporter' : 'target',
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      respondedAt: row.respondedAt?.toISOString() ?? null,
    };
  }

  private serializeMessage(
    message: {
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
    },
    reporterId: string,
    targetUserId: string,
  ) {
    const isDeleted = Boolean(message.deletedAt);
    return {
      id: message.id,
      senderId: message.senderId,
      senderSide:
        message.senderId === reporterId
          ? 'reporter'
          : message.senderId === targetUserId
            ? 'target'
            : 'unknown',
      messageType: message.messageType,
      body: isDeleted ? null : message.body,
      isDeleted,
      editedAt: message.editedAt?.toISOString() ?? null,
      deletedAt: message.deletedAt?.toISOString() ?? null,
      hasAttachment: Boolean(message.attachmentStorageKey),
      attachmentMimeType: message.attachmentMimeType,
      attachmentFileName: message.attachmentFileName,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
