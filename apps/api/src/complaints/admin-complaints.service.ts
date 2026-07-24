import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberComplaintStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StaffNotificationService } from '../staff/staff-notification.service';
import { MemberComplaintsService } from './member-complaints.service';

@Injectable()
export class AdminComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly complaints: MemberComplaintsService,
    private readonly staffNotifications: StaffNotificationService,
  ) {}

  async listAll(status?: MemberComplaintStatus) {
    const rows = await this.prisma.memberComplaint.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        reporter: {
          select: {
            profile: { select: { fullName: true, profileCode: true } },
          },
        },
        targetProfile: {
          select: {
            id: true,
            profileCode: true,
            fullName: true,
          },
        },
        assignedConsultant: {
          select: {
            profile: { select: { fullName: true } },
            staffProfile: { select: { fullName: true } },
          },
        },
      },
    });
    return rows.map((row) => this.complaints.toDto(row));
  }

  async getDetail(complaintId: string) {
    const complaint = await this.prisma.memberComplaint.findUnique({
      where: { id: complaintId },
      include: {
        reporter: {
          select: {
            profile: { select: { fullName: true, profileCode: true } },
          },
        },
        targetProfile: {
          select: {
            id: true,
            profileCode: true,
            fullName: true,
          },
        },
        assignedConsultant: {
          select: {
            profile: { select: { fullName: true } },
            staffProfile: { select: { fullName: true } },
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return {
      ...this.complaints.toDto(complaint),
      viewerIsConsultant: true,
      viewerIsReporter: false,
      viewerIsAdmin: true,
    };
  }

  async listConsultants() {
    const rows = await this.prisma.user.findMany({
      where: {
        role: UserRole.marriage_consultant,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        phone: true,
        staffProfile: { select: { fullName: true } },
        profile: { select: { fullName: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      fullName:
        row.staffProfile?.fullName ?? row.profile?.fullName ?? null,
      email: row.email,
      phone: row.phone,
    }));
  }

  async reassign(complaintId: string, consultantId: string | null) {
    const complaint = await this.prisma.memberComplaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    if (
      complaint.status === MemberComplaintStatus.resolved ||
      complaint.status === MemberComplaintStatus.dismissed ||
      complaint.status === MemberComplaintStatus.cancelled
    ) {
      throw new BadRequestException('Cannot reassign a closed complaint');
    }

    if (consultantId) {
      const consultant = await this.prisma.user.findUnique({
        where: { id: consultantId },
        select: { role: true, isActive: true },
      });
      if (
        !consultant ||
        !consultant.isActive ||
        consultant.role !== UserRole.marriage_consultant
      ) {
        throw new BadRequestException('Invalid marriage consultant');
      }
    }

    const updated = await this.prisma.memberComplaint.update({
      where: { id: complaintId },
      data: {
        assignedConsultantId: consultantId,
        status: consultantId
          ? complaint.status === MemberComplaintStatus.submitted
            ? MemberComplaintStatus.assigned
            : complaint.status
          : MemberComplaintStatus.submitted,
      },
      include: {
        reporter: {
          select: {
            profile: { select: { fullName: true, profileCode: true } },
          },
        },
        targetProfile: {
          select: {
            id: true,
            profileCode: true,
            fullName: true,
          },
        },
        assignedConsultant: {
          select: {
            profile: { select: { fullName: true } },
            staffProfile: { select: { fullName: true } },
          },
        },
      },
    });

    if (consultantId && consultantId !== complaint.assignedConsultantId) {
      void this.staffNotifications.notifyComplaintAssigned({
        consultantId,
        complaintId: updated.id,
        targetProfileCode: updated.targetProfile.profileCode,
      });
    }

    return this.complaints.toDto(updated);
  }

  async resolve(
    complaintId: string,
    status: MemberComplaintStatus,
    resolutionNote?: string,
  ) {
    const complaint = await this.prisma.memberComplaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    if (
      status !== MemberComplaintStatus.resolved &&
      status !== MemberComplaintStatus.dismissed
    ) {
      throw new BadRequestException('Status must be resolved or dismissed');
    }

    const updated = await this.prisma.memberComplaint.update({
      where: { id: complaintId },
      data: {
        status,
        resolutionNote: resolutionNote?.trim() || null,
        resolvedAt: new Date(),
      },
      include: {
        reporter: {
          select: {
            profile: { select: { fullName: true, profileCode: true } },
          },
        },
        targetProfile: {
          select: {
            id: true,
            profileCode: true,
            fullName: true,
          },
        },
        assignedConsultant: {
          select: {
            profile: { select: { fullName: true } },
            staffProfile: { select: { fullName: true } },
          },
        },
      },
    });

    return this.complaints.toDto(updated);
  }
}
