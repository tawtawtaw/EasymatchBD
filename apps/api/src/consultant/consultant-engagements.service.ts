import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import {
  ConsultantEngagementStatus,
  ConsultantPaymentStatus,
  ConsultantServiceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StaffNotificationService } from '../staff/staff-notification.service';

@Injectable()
export class ConsultantEngagementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffNotifications: StaffNotificationService,
  ) {}

  toDto(row: {
    id: string;
    connectionId: string;
    serviceType: ConsultantServiceType;
    serviceLabelEn: string;
    amountBdt: Prisma.Decimal;
    currency: string;
    requestedById: string;
    status: ConsultantEngagementStatus;
    assignedConsultantId: string | null;
    memberNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      connectionId: row.connectionId,
      serviceType: row.serviceType,
      serviceLabelEn: row.serviceLabelEn,
      amountBdt: row.amountBdt.toFixed(2),
      currency: row.currency,
      requestedById: row.requestedById,
      status: row.status,
      assignedConsultantId: row.assignedConsultantId,
      memberNotes: row.memberNotes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async ensureEngagementForPayment(paymentId: string) {
    const existing = await this.prisma.consultantEngagement.findUnique({
      where: { paymentId },
    });
    if (existing) {
      return existing;
    }

    const payment = await this.prisma.consultantPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.status !== ConsultantPaymentStatus.validated) {
      return null;
    }

    const engagement = await this.prisma.consultantEngagement.create({
      data: {
        connectionId: payment.connectionId,
        serviceType: payment.serviceType,
        serviceLabelEn: payment.serviceLabelEn,
        amountBdt: payment.amountBdt,
        currency: payment.currency,
        requestedById: payment.userId,
        paymentId: payment.id,
        memberNotes: payment.memberNotes,
        status: ConsultantEngagementStatus.queued,
      },
    });

    void this.staffNotifications.notifyConsultantCaseQueued({
      engagementId: engagement.id,
      serviceLabel: engagement.serviceLabelEn,
    });

    return engagement;
  }

  private async assertConnectionMember(userId: string, connectionId: string) {
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }
    if (
      connection.userLowId !== userId &&
      connection.userHighId !== userId
    ) {
      throw new ForbiddenException('Not a member of this connection');
    }
    return connection;
  }

  async listForConnection(userId: string, connectionId: string) {
    await this.assertConnectionMember(userId, connectionId);

    const rows = await this.prisma.consultantEngagement.findMany({
      where: { connectionId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toDto(row));
  }

  async listCasesForConsultant(consultantId: string) {
    const rows = await this.prisma.consultantEngagement.findMany({
      where: {
        OR: [
          { status: ConsultantEngagementStatus.queued },
          { assignedConsultantId: consultantId },
        ],
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      include: {
        requestedBy: {
          select: {
            phone: true,
            profile: { select: { fullName: true, profileCode: true } },
          },
        },
        connection: {
          select: {
            privacyLevel: true,
            userLow: {
              select: {
                profile: { select: { fullName: true, profileCode: true } },
              },
            },
            userHigh: {
              select: {
                profile: { select: { fullName: true, profileCode: true } },
              },
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      ...this.toDto(row),
      requester: {
        fullName: row.requestedBy.profile?.fullName ?? null,
        profileCode: row.requestedBy.profile?.profileCode ?? null,
        phone: row.requestedBy.phone,
      },
      connection: {
        privacyLevel: row.connection.privacyLevel,
        memberLow: {
          fullName: row.connection.userLow.profile?.fullName ?? null,
          profileCode: row.connection.userLow.profile?.profileCode ?? null,
        },
        memberHigh: {
          fullName: row.connection.userHigh.profile?.fullName ?? null,
          profileCode: row.connection.userHigh.profile?.profileCode ?? null,
        },
      },
    }));
  }

  async assignCase(consultantId: string, engagementId: string) {
    const engagement = await this.prisma.consultantEngagement.findUnique({
      where: { id: engagementId },
    });

    if (!engagement) {
      throw new NotFoundException('Consultant case not found');
    }

    if (engagement.status === ConsultantEngagementStatus.completed) {
      throw new BadRequestException('This case is already completed.');
    }

    if (engagement.status === ConsultantEngagementStatus.cancelled) {
      throw new BadRequestException('This case was cancelled.');
    }

    if (
      engagement.assignedConsultantId &&
      engagement.assignedConsultantId !== consultantId
    ) {
      throw new BadRequestException('This case is assigned to another consultant.');
    }

    const updated = await this.prisma.consultantEngagement.update({
      where: { id: engagementId },
      data: {
        assignedConsultantId: consultantId,
        status:
          engagement.status === ConsultantEngagementStatus.queued
            ? ConsultantEngagementStatus.assigned
            : engagement.status,
      },
    });

    return this.toDto(updated);
  }

  async updateCaseStatus(
    consultantId: string,
    engagementId: string,
    status: ConsultantEngagementStatus,
  ) {
    const engagement = await this.prisma.consultantEngagement.findUnique({
      where: { id: engagementId },
    });

    if (!engagement) {
      throw new NotFoundException('Consultant case not found');
    }

    if (engagement.assignedConsultantId !== consultantId) {
      throw new ForbiddenException('Assign yourself to this case first.');
    }

    const allowed: ConsultantEngagementStatus[] = [
      ConsultantEngagementStatus.in_progress,
      ConsultantEngagementStatus.completed,
      ConsultantEngagementStatus.cancelled,
    ];
    if (!allowed.includes(status)) {
      throw new BadRequestException('Invalid status transition.');
    }

    const updated = await this.prisma.consultantEngagement.update({
      where: { id: engagementId },
      data: { status },
    });

    return this.toDto(updated);
  }

  async listAllForAdmin(status?: ConsultantEngagementStatus) {
    const rows = await this.prisma.consultantEngagement.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        requestedBy: {
          select: {
            phone: true,
            profile: { select: { fullName: true, profileCode: true } },
          },
        },
        assignedConsultant: {
          select: {
            profile: { select: { fullName: true } },
            staffProfile: { select: { fullName: true } },
          },
        },
        connection: {
          select: {
            privacyLevel: true,
            userLow: {
              select: {
                profile: { select: { fullName: true, profileCode: true } },
              },
            },
            userHigh: {
              select: {
                profile: { select: { fullName: true, profileCode: true } },
              },
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      ...this.toDto(row),
      requester: {
        fullName: row.requestedBy.profile?.fullName ?? null,
        profileCode: row.requestedBy.profile?.profileCode ?? null,
        phone: row.requestedBy.phone,
      },
      assignedConsultantName:
        row.assignedConsultant?.staffProfile?.fullName ??
        row.assignedConsultant?.profile?.fullName ??
        null,
      connection: {
        privacyLevel: row.connection.privacyLevel,
        memberLow: {
          fullName: row.connection.userLow.profile?.fullName ?? null,
          profileCode: row.connection.userLow.profile?.profileCode ?? null,
        },
        memberHigh: {
          fullName: row.connection.userHigh.profile?.fullName ?? null,
          profileCode: row.connection.userHigh.profile?.profileCode ?? null,
        },
      },
    }));
  }

  assertConsultantRole(role: string) {
    if (role !== UserRole.MARRIAGE_CONSULTANT && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Marriage consultant access required');
    }
  }
}
