import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConsultantEngagementStatus,
  MediaReviewStatus,
  MemberComplaintStatus,
  ProfileDeletionRequestStatus,
  StaffNotificationType,
  UserRole,
} from '@prisma/client';
import {
  isStaffRole,
  isSuperAdminRole,
  isVerificationOfficerRole,
  UserRole as SharedUserRole,
} from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';

const verificationQueueWhere = {
  user: { isActive: true },
  OR: [
    { photos: { some: { status: MediaReviewStatus.pending } } },
    {
      AND: [
        { nidVerifiedAt: null },
        { nidDocuments: { some: { status: MediaReviewStatus.pending } } },
      ],
    },
    { profileBiodataReviewStatus: MediaReviewStatus.pending },
  ],
};

export type StaffAlertsSummary = {
  verificationPending: number;
  complaintsUnassigned: number;
  consultantCasesQueued: number;
  deletionRequestsPending: number;
  unreadNotifications: number;
};

export type StaffNotificationItem = {
  id: string;
  type: StaffNotificationType;
  title: string;
  body: string;
  linkPath: string;
  entityId: string | null;
  createdAt: string;
  read: boolean;
};

const STAFF_ALERTS_CACHE_TTL_MS = 15_000;

@Injectable()
export class StaffAlertsService {
  private readonly summaryCache = new Map<
    string,
    { expiresAt: number; value: StaffAlertsSummary }
  >();

  constructor(private readonly prisma: PrismaService) {}

  assertStaffRole(role: string) {
    if (!isStaffRole(role)) {
      throw new ForbiddenException('Staff access required');
    }
  }

  private visibleAudienceRoles(role: string): UserRole[] {
    if (isSuperAdminRole(role)) {
      return [
        UserRole.super_admin,
        UserRole.verification_officer,
        UserRole.marriage_consultant,
      ];
    }
    if (isVerificationOfficerRole(role)) {
      return [UserRole.verification_officer];
    }
    if (role === SharedUserRole.MARRIAGE_CONSULTANT) {
      return [UserRole.marriage_consultant];
    }
    return [];
  }

  private notificationVisibilityFilter(userId: string, role: string) {
    const audienceRoles = this.visibleAudienceRoles(role);
    return {
      OR: [
        { targetUserId: userId },
        {
          targetUserId: null,
          audienceRole: { in: audienceRoles },
        },
      ],
    };
  }

  async getSummary(userId: string, role: string): Promise<StaffAlertsSummary> {
    this.assertStaffRole(role);

    const cacheKey = `${userId}:${role}`;
    const cached = this.summaryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const [
      verificationPending,
      complaintsUnassigned,
      consultantCasesQueued,
      deletionRequestsPending,
      unreadNotifications,
    ] = await Promise.all([
      isSuperAdminRole(role) || isVerificationOfficerRole(role)
        ? this.prisma.profile.count({ where: verificationQueueWhere })
        : Promise.resolve(0),
      isSuperAdminRole(role) || role === SharedUserRole.MARRIAGE_CONSULTANT
        ? this.prisma.memberComplaint.count({
            where: {
              status: MemberComplaintStatus.submitted,
              assignedConsultantId: null,
            },
          })
        : Promise.resolve(0),
      isSuperAdminRole(role) || role === SharedUserRole.MARRIAGE_CONSULTANT
        ? this.prisma.consultantEngagement.count({
            where: { status: ConsultantEngagementStatus.queued },
          })
        : Promise.resolve(0),
      isSuperAdminRole(role)
        ? this.prisma.profileDeletionRequest.count({
            where: { status: ProfileDeletionRequestStatus.pending },
          })
        : Promise.resolve(0),
      this.countUnreadNotifications(userId, role),
    ]);

    const value = {
      verificationPending,
      complaintsUnassigned,
      consultantCasesQueued,
      deletionRequestsPending,
      unreadNotifications,
    };

    this.summaryCache.set(cacheKey, {
      expiresAt: Date.now() + STAFF_ALERTS_CACHE_TTL_MS,
      value,
    });

    return value;
  }

  invalidateSummary(userId: string, role?: string) {
    if (role) {
      this.summaryCache.delete(`${userId}:${role}`);
      return;
    }

    for (const key of this.summaryCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.summaryCache.delete(key);
      }
    }
  }

  private async countUnreadNotifications(userId: string, role: string) {
    return this.prisma.staffNotification.count({
      where: {
        ...this.notificationVisibilityFilter(userId, role),
        reads: { none: { userId } },
      },
    });
  }

  async listNotifications(
    userId: string,
    role: string,
    limit = 20,
  ): Promise<StaffNotificationItem[]> {
    this.assertStaffRole(role);

    const rows = await this.prisma.staffNotification.findMany({
      where: this.notificationVisibilityFilter(userId, role),
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      include: {
        reads: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      linkPath: row.linkPath,
      entityId: row.entityId,
      createdAt: row.createdAt.toISOString(),
      read: row.reads.length > 0,
    }));
  }

  async markRead(userId: string, role: string, ids: string[]) {
    this.assertStaffRole(role);
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { ok: true, marked: 0 };
    }

    const visible = await this.prisma.staffNotification.findMany({
      where: {
        id: { in: uniqueIds },
        ...this.notificationVisibilityFilter(userId, role),
      },
      select: { id: true },
    });

    if (visible.length === 0) {
      return { ok: true, marked: 0 };
    }

    await this.prisma.staffNotificationRead.createMany({
      data: visible.map((row) => ({
        notificationId: row.id,
        userId,
      })),
      skipDuplicates: true,
    });

    this.invalidateSummary(userId, role);

    return { ok: true, marked: visible.length };
  }

  async markAllRead(userId: string, role: string) {
    this.assertStaffRole(role);

    const unread = await this.prisma.staffNotification.findMany({
      where: this.notificationVisibilityFilter(userId, role),
      select: {
        id: true,
        reads: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const ids = unread.filter((row) => row.reads.length === 0).map((row) => row.id);
    return this.markRead(userId, role, ids);
  }

  async assertNotificationVisible(
    userId: string,
    role: string,
    notificationId: string,
  ) {
    const row = await this.prisma.staffNotification.findFirst({
      where: {
        id: notificationId,
        ...this.notificationVisibilityFilter(userId, role),
      },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    return row;
  }
}
