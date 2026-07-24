import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isStaffRole,
  isValidProfileCode,
  normalizeProfileCode,
  UserRole,
} from '@easymatch/shared';
import {
  MemberComplaintStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../subscriptions/subscription-access.service';
import { StaffNotificationService } from '../staff/staff-notification.service';
import { CreateMemberComplaintDto } from './dto/create-member-complaint.dto';

const OPEN_STATUSES: MemberComplaintStatus[] = [
  MemberComplaintStatus.submitted,
  MemberComplaintStatus.assigned,
  MemberComplaintStatus.in_progress,
];

@Injectable()
export class MemberComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionAccessService,
    private readonly staffNotifications: StaffNotificationService,
  ) {}

  private complaintInclude = {
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
  } satisfies Prisma.MemberComplaintInclude;

  toDto(row: {
    id: string;
    reporterId: string;
    targetProfileId: string;
    category: string;
    description: string;
    status: MemberComplaintStatus;
    assignedConsultantId: string | null;
    resolutionNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt: Date | null;
    reporter?: {
      profile: { fullName: string | null; profileCode: string | null } | null;
    };
    targetProfile?: {
      id: string;
      profileCode: string;
      fullName: string | null;
    };
    assignedConsultant?: {
      profile: { fullName: string | null } | null;
      staffProfile: { fullName: string | null } | null;
    } | null;
  }) {
    return {
      id: row.id,
      reporterId: row.reporterId,
      targetProfileId: row.targetProfileId,
      category: row.category,
      description: row.description,
      status: row.status,
      assignedConsultantId: row.assignedConsultantId,
      resolutionNote: row.resolutionNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      reporter: row.reporter
        ? {
            fullName: row.reporter.profile?.fullName ?? null,
            profileCode: row.reporter.profile?.profileCode ?? null,
          }
        : undefined,
      targetProfile: row.targetProfile
        ? {
            id: row.targetProfile.id,
            profileCode: row.targetProfile.profileCode,
          }
        : undefined,
      assignedConsultantName: row.assignedConsultant
        ? row.assignedConsultant.staffProfile?.fullName ??
          row.assignedConsultant.profile?.fullName ??
          null
        : null,
    };
  }

  assertConsultantRole(role: string) {
    if (role !== UserRole.MARRIAGE_CONSULTANT && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Marriage consultant access required');
    }
  }

  private async findProfileByCode(profileCodeInput: string) {
    const normalized = normalizeProfileCode(profileCodeInput.trim());
    if (!isValidProfileCode(normalized)) {
      throw new BadRequestException('Invalid profile ID. Enter the 8-digit profile code.');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { profileCode: normalized },
      select: {
        id: true,
        userId: true,
        profileCode: true,
        fullName: true,
        isVerified: true,
        user: { select: { isActive: true } },
      },
    });

    if (!profile || !profile.user.isActive) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async lookupTargetProfile(userId: string, role: string, profileCodeInput: string) {
    if (isStaffRole(role)) {
      throw new BadRequestException('Staff accounts cannot file member complaints');
    }

    await this.subscriptions.assertPaidMember(userId);

    const normalized = normalizeProfileCode(profileCodeInput.trim());
    if (!isValidProfileCode(normalized)) {
      return {
        found: false as const,
        reason: 'invalid' as const,
      };
    }

    const profile = await this.prisma.profile.findUnique({
      where: { profileCode: normalized },
      select: {
        profileCode: true,
        isVerified: true,
        userId: true,
        user: { select: { isActive: true } },
      },
    });

    if (!profile || !profile.user.isActive) {
      return {
        found: false as const,
        reason: 'not_found' as const,
      };
    }

    if (profile.userId === userId) {
      return {
        found: false as const,
        reason: 'self' as const,
      };
    }

    if (!profile.isVerified) {
      return {
        found: true as const,
        profileCode: profile.profileCode,
        isVerified: false,
      };
    }

    return {
      found: true as const,
      profileCode: profile.profileCode,
      isVerified: true,
    };
  }

  private async getComplaintOrThrow(complaintId: string) {
    const complaint = await this.prisma.memberComplaint.findUnique({
      where: { id: complaintId },
      include: this.complaintInclude,
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    return complaint;
  }

  assertMemberAccess(userId: string, role: string, complaint: { reporterId: string; assignedConsultantId: string | null }) {
    if (this.isConsultantRole(role)) {
      if (
        complaint.assignedConsultantId !== userId &&
        role !== UserRole.SUPER_ADMIN
      ) {
        // consultants can view unassigned queue via list; detail requires assign or super admin for unassigned
      }
      return;
    }
    if (complaint.reporterId !== userId) {
      throw new ForbiddenException('Not allowed to access this complaint');
    }
  }

  private isConsultantRole(role: string) {
    return role === UserRole.MARRIAGE_CONSULTANT || role === UserRole.SUPER_ADMIN;
  }

  async create(userId: string, role: string, dto: CreateMemberComplaintDto) {
    if (isStaffRole(role)) {
      throw new BadRequestException('Staff accounts cannot file member complaints');
    }

    await this.subscriptions.assertPaidMember(userId);

    const reporterProfile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!reporterProfile) {
      throw new BadRequestException('Complete your profile before filing a complaint');
    }

    const target = await this.findProfileByCode(dto.profileCode);
    if (!target.isVerified) {
      throw new BadRequestException(
        'Complaints can only be filed against verified members',
      );
    }
    if (target.userId === userId) {
      throw new BadRequestException('You cannot file a complaint against your own profile');
    }

    const existingOpen = await this.prisma.memberComplaint.findFirst({
      where: {
        reporterId: userId,
        targetProfileId: target.id,
        status: { in: OPEN_STATUSES },
      },
    });
    if (existingOpen) {
      throw new BadRequestException(
        'You already have an open complaint against this profile',
      );
    }

    const complaint = await this.prisma.memberComplaint.create({
      data: {
        reporterId: userId,
        targetProfileId: target.id,
        category: dto.category,
        description: dto.description.trim(),
      },
      include: this.complaintInclude,
    });

    void this.staffNotifications.notifyComplaintSubmitted({
      complaintId: complaint.id,
      targetProfileCode: target.profileCode,
      category: dto.category,
    });

    return this.toDto(complaint);
  }

  async listForMember(userId: string) {
    const rows = await this.prisma.memberComplaint.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
      include: this.complaintInclude,
    });
    return rows.map((row) => this.toDto(row));
  }

  async listForConsultant(consultantId: string) {
    const rows = await this.prisma.memberComplaint.findMany({
      where: {
        OR: [
          { status: MemberComplaintStatus.submitted },
          { assignedConsultantId: consultantId },
        ],
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      include: this.complaintInclude,
    });
    return rows.map((row) => this.toDto(row));
  }

  async getDetail(userId: string, role: string, complaintId: string) {
    const complaint = await this.getComplaintOrThrow(complaintId);

    if (this.isConsultantRole(role)) {
      const canView =
        role === UserRole.SUPER_ADMIN ||
        complaint.assignedConsultantId === userId ||
        (complaint.status === MemberComplaintStatus.submitted &&
          !complaint.assignedConsultantId);
      if (!canView) {
        throw new ForbiddenException('Assign yourself to this complaint first');
      }
    } else if (complaint.reporterId !== userId) {
      throw new ForbiddenException('Not allowed to access this complaint');
    }

    return {
      ...this.toDto(complaint),
      viewerIsConsultant: this.isConsultantRole(role),
      viewerIsReporter: complaint.reporterId === userId,
    };
  }

  async cancel(userId: string, complaintId: string) {
    const complaint = await this.getComplaintOrThrow(complaintId);
    if (complaint.reporterId !== userId) {
      throw new ForbiddenException('Not allowed to cancel this complaint');
    }
    if (complaint.status !== MemberComplaintStatus.submitted) {
      throw new BadRequestException('Only submitted complaints can be cancelled');
    }

    const updated = await this.prisma.memberComplaint.update({
      where: { id: complaintId },
      data: { status: MemberComplaintStatus.cancelled },
      include: this.complaintInclude,
    });
    return this.toDto(updated);
  }

  async assign(consultantId: string, complaintId: string) {
    const complaint = await this.getComplaintOrThrow(complaintId);

    if (
      complaint.status === MemberComplaintStatus.resolved ||
      complaint.status === MemberComplaintStatus.dismissed ||
      complaint.status === MemberComplaintStatus.cancelled
    ) {
      throw new BadRequestException('This complaint is already closed');
    }

    if (
      complaint.assignedConsultantId &&
      complaint.assignedConsultantId !== consultantId
    ) {
      throw new BadRequestException(
        'This complaint is assigned to another consultant',
      );
    }

    const updated = await this.prisma.memberComplaint.update({
      where: { id: complaintId },
      data: {
        assignedConsultantId: consultantId,
        status:
          complaint.status === MemberComplaintStatus.submitted
            ? MemberComplaintStatus.assigned
            : complaint.status,
      },
      include: this.complaintInclude,
    });

    if (
      complaint.status === MemberComplaintStatus.submitted &&
      updated.assignedConsultantId === consultantId
    ) {
      void this.staffNotifications.notifyComplaintAssigned({
        consultantId,
        complaintId: updated.id,
        targetProfileCode: updated.targetProfile.profileCode,
      });
    }

    return this.toDto(updated);
  }

  async updateStatus(
    consultantId: string,
    complaintId: string,
    status: MemberComplaintStatus,
  ) {
    const complaint = await this.getComplaintOrThrow(complaintId);
    if (complaint.assignedConsultantId !== consultantId) {
      throw new ForbiddenException('Assign yourself to this complaint first');
    }

    const allowed: MemberComplaintStatus[] = [
      MemberComplaintStatus.in_progress,
    ];
    if (!allowed.includes(status)) {
      throw new BadRequestException('Invalid status transition');
    }

    const updated = await this.prisma.memberComplaint.update({
      where: { id: complaintId },
      data: { status },
      include: this.complaintInclude,
    });
    return this.toDto(updated);
  }

  async resolve(
    consultantId: string,
    complaintId: string,
    status: MemberComplaintStatus,
    resolutionNote?: string,
    role?: string,
  ) {
    const complaint = await this.getComplaintOrThrow(complaintId);
    if (
      complaint.assignedConsultantId !== consultantId &&
      role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Assign yourself to this complaint first');
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
      include: this.complaintInclude,
    });
    return this.toDto(updated);
  }
}
