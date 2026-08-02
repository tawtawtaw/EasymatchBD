import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InterestStatus,
  MediaReviewStatus,
  Prisma,
  ProfileDeletionRequestStatus,
  ProfileDeletionTargetKind,
} from '@prisma/client';
import { isStaffRole } from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StaffNotificationService } from '../staff/staff-notification.service';
import { AuthUserCacheService } from '../auth/auth-user-cache.service';

@Injectable()
export class AdminProfileDeletionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly staffNotifications: StaffNotificationService,
    private readonly authUserCache: AuthUserCacheService,
  ) {}

  async createRequest(
    requestedById: string,
    targetUserId: string,
    reason?: string,
  ) {
    if (requestedById === targetUserId) {
      throw new BadRequestException('You cannot request deletion of your own account');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: { select: { id: true, profileCode: true } } },
    });

    if (!target) {
      throw new NotFoundException('Profile not found');
    }

    if (!target.isActive) {
      throw new BadRequestException('This account is already inactive');
    }

    if (isStaffRole(target.role)) {
      throw new BadRequestException(
        'Staff accounts cannot be scheduled for deletion',
      );
    }

    const existingPending = await this.prisma.profileDeletionRequest.findFirst({
      where: {
        targetUserId,
        status: ProfileDeletionRequestStatus.pending,
      },
    });
    if (existingPending) {
      throw new BadRequestException(
        'A pending deletion request already exists for this account',
      );
    }

    const request = await this.prisma.profileDeletionRequest.create({
      data: {
        targetUserId,
        targetKind: isStaffRole(target.role)
          ? ProfileDeletionTargetKind.staff
          : ProfileDeletionTargetKind.member,
        profileId: target.profile?.id ?? null,
        reason: reason?.trim() || null,
        requestedById,
      },
      include: this.requestInclude(),
    });

    const targetLabel =
      target.profile?.profileCode?.trim() ||
      target.phone?.trim() ||
      targetUserId;
    void this.staffNotifications.notifyProfileDeletionRequest({
      requestId: request.id,
      targetLabel,
    });

    return this.toRequestItem(request);
  }

  async listRequests(status?: ProfileDeletionRequestStatus) {
    await this.cancelStalePendingDeletionRequests();

    const where =
      status === ProfileDeletionRequestStatus.pending
        ? {
            status,
            targetUser: { isActive: true },
          }
        : status
          ? { status }
          : undefined;

    const requests = await this.prisma.profileDeletionRequest.findMany({
      where,
      include: this.requestInclude(),
      orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
    });

    return requests.map((request) => this.toRequestItem(request));
  }

  async approveRequest(requestId: string, reviewerId: string) {
    const request = await this.getPendingRequest(requestId);
    this.assertDifferentReviewer(request.requestedById, reviewerId);

    await this.prisma.$transaction(async (tx) => {
      await this.deactivateUserAccount(tx, request.targetUserId);
      await tx.profileDeletionRequest.update({
        where: { id: request.id },
        data: {
          status: ProfileDeletionRequestStatus.approved,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });
    });

    return { approved: true };
  }

  async rejectRequest(
    requestId: string,
    reviewerId: string,
    reviewNote?: string,
  ) {
    const request = await this.getPendingRequest(requestId);
    this.assertDifferentReviewer(request.requestedById, reviewerId);

    await this.prisma.profileDeletionRequest.update({
      where: { id: request.id },
      data: {
        status: ProfileDeletionRequestStatus.rejected,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNote: reviewNote?.trim() || null,
      },
    });

    return { rejected: true };
  }

  async cancelRequest(requestId: string, requestedById: string) {
    const request = await this.getPendingRequest(requestId);
    if (request.requestedById !== requestedById) {
      throw new ForbiddenException(
        'Only the requesting super admin can cancel this request',
      );
    }

    await this.prisma.profileDeletionRequest.update({
      where: { id: request.id },
      data: { status: ProfileDeletionRequestStatus.cancelled },
    });

    return { cancelled: true };
  }

  private assertDifferentReviewer(requestedById: string, reviewerId: string) {
    if (requestedById === reviewerId) {
      throw new ForbiddenException(
        'A different super admin must approve or reject this deletion request',
      );
    }
  }

  private async getPendingRequest(requestId: string) {
    const request = await this.prisma.profileDeletionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Deletion request not found');
    }
    if (request.status !== ProfileDeletionRequestStatus.pending) {
      throw new BadRequestException('This deletion request is no longer pending');
    }

    return request;
  }

  private async deactivateUserAccount(
    tx: Prisma.TransactionClient,
    targetUserId: string,
  ) {
    const user = await tx.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: {
          include: { photos: true, nidDocuments: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    if (isStaffRole(user.role)) {
      throw new BadRequestException('Staff accounts cannot be deactivated');
    }

    for (const photo of user.profile?.photos ?? []) {
      await this.storage.delete(photo.storageKey);
    }
    for (const document of user.profile?.nidDocuments ?? []) {
      await this.storage.delete(document.storageKey);
    }

    await tx.interest.updateMany({
      where: {
        status: InterestStatus.pending,
        OR: [{ senderId: targetUserId }, { receiverId: targetUserId }],
      },
      data: { status: InterestStatus.declined, respondedAt: new Date() },
    });

    if (user.profile?.id) {
      await this.clearProfileVerificationPending(tx, user.profile.id);
    }

    await tx.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
    });

    this.authUserCache.invalidate(targetUserId);
  }

  private async cancelStalePendingDeletionRequests() {
    const now = new Date();
    await this.prisma.profileDeletionRequest.updateMany({
      where: {
        status: ProfileDeletionRequestStatus.pending,
        targetUser: { isActive: false },
      },
      data: {
        status: ProfileDeletionRequestStatus.cancelled,
        reviewedAt: now,
        reviewNote: 'Auto-cancelled: account already deactivated',
      },
    });
  }

  private async clearProfileVerificationPending(
    tx: Prisma.TransactionClient,
    profileId: string,
  ) {
    const now = new Date();

    await tx.profilePhoto.updateMany({
      where: { profileId, status: MediaReviewStatus.pending },
      data: { status: MediaReviewStatus.rejected, updatedAt: now },
    });

    await tx.nidDocument.updateMany({
      where: { profileId, status: MediaReviewStatus.pending },
      data: {
        status: MediaReviewStatus.rejected,
        reviewedAt: now,
        updatedAt: now,
      },
    });

    await tx.profile.updateMany({
      where: {
        id: profileId,
        profileBiodataReviewStatus: MediaReviewStatus.pending,
      },
      data: {
        profileBiodataReviewStatus: null,
        profileBiodataReviewedAt: null,
      },
    });
  }

  private requestInclude() {
    return {
      targetUser: {
        select: {
          id: true,
          role: true,
          phone: true,
          email: true,
          isActive: true,
          profile: {
            select: {
              id: true,
              profileCode: true,
              fullName: true,
            },
          },
          staffProfile: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      },
      requestedBy: {
        select: {
          id: true,
          phone: true,
          email: true,
          staffProfile: { select: { fullName: true, email: true } },
        },
      },
      reviewedBy: {
        select: {
          id: true,
          phone: true,
          email: true,
          staffProfile: { select: { fullName: true, email: true } },
        },
      },
    } as const;
  }

  private toRequestItem(
    request: Prisma.ProfileDeletionRequestGetPayload<{
      include: ReturnType<AdminProfileDeletionsService['requestInclude']>;
    }>,
  ) {
    const target = request.targetUser;
    const isStaff = isStaffRole(target.role);

    return {
      id: request.id,
      status: request.status,
      targetKind: request.targetKind,
      profileId: request.profileId,
      reason: request.reason,
      reviewNote: request.reviewNote,
      requestedAt: request.requestedAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      target: {
        userId: target.id,
        role: target.role,
        phone: target.phone,
        email: target.email ?? target.staffProfile?.email ?? null,
        isActive: target.isActive,
        profileCode: target.profile?.profileCode ?? null,
        fullName: isStaff
          ? target.staffProfile?.fullName
          : target.profile?.fullName,
      },
      requestedBy: this.toAdminActor(request.requestedBy),
      reviewedBy: request.reviewedBy
        ? this.toAdminActor(request.reviewedBy)
        : null,
    };
  }

  private toAdminActor(
    user: {
      id: string;
      phone: string | null;
      email: string | null;
      staffProfile: { fullName: string | null; email: string | null } | null;
    },
  ) {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email ?? user.staffProfile?.email ?? null,
      fullName: user.staffProfile?.fullName ?? null,
    };
  }
}
