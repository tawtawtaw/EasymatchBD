import { Injectable } from '@nestjs/common';
import {
  MediaReviewStatus,
  NidDocumentSide,
  NidDocumentSubject,
  ProfilePhotoType,
  VerificationAlertType,
  type NidDocument,
  type Profile,
  type ProfilePhoto,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isOnBehalfProfile, isProfileFullyVerified } from './verification-status';

export type VerificationSummaryItem = {
  category: 'biodata' | 'nid' | 'photo';
  labelKey: string;
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  needsAction: boolean;
  photoId?: string;
  photoType?: 'primary' | 'gallery';
};

@Injectable()
export class VerificationAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAlert(
    userId: string,
    alertType: VerificationAlertType,
    options?: { officerMessage?: string; contextKey?: string },
  ) {
    const officerMessage = options?.officerMessage?.trim();
    return this.prisma.verificationAlert.create({
      data: {
        userId,
        alertType,
        officerMessage: officerMessage || null,
        contextKey: options?.contextKey ?? null,
      },
    });
  }

  async getFeedback(userId: string) {
    const [profile, alerts] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { userId },
        include: { photos: true, nidDocuments: true },
      }),
      this.loadAlerts(userId),
    ]);

    return this.buildFeedbackResponse(profile, alerts);
  }

  async getFeedbackForProfile(
    profile: Pick<
      Profile,
      | 'profileBiodataReviewStatus'
      | 'nidVerifiedAt'
      | 'creatorNidVerifiedAt'
      | 'creationMode'
      | 'isVerified'
    > & {
      photos: Pick<ProfilePhoto, 'id' | 'type' | 'status'>[];
      nidDocuments: Pick<NidDocument, 'side' | 'status' | 'subject'>[];
    } | null,
    userId: string,
  ) {
    const alerts = await this.loadAlerts(userId);
    return this.buildFeedbackResponse(profile, alerts);
  }

  private async loadAlerts(userId: string) {
    return this.prisma.verificationAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        alertType: true,
        officerMessage: true,
        contextKey: true,
        readAt: true,
        createdAt: true,
      },
    });
  }

  private buildFeedbackResponse(
    profile: Pick<
      Profile,
      | 'profileBiodataReviewStatus'
      | 'nidVerifiedAt'
      | 'creatorNidVerifiedAt'
      | 'creationMode'
      | 'isVerified'
    > & {
      photos: Pick<ProfilePhoto, 'id' | 'type' | 'status'>[];
      nidDocuments: Pick<NidDocument, 'side' | 'status' | 'subject'>[];
    } | null,
    alerts: Array<{
      id: string;
      alertType: VerificationAlertType;
      officerMessage: string | null;
      contextKey: string | null;
      readAt: Date | null;
      createdAt: Date;
    }>,
  ) {
    const unreadCount = alerts.filter((alert) => !alert.readAt).length;

    return {
      alerts: alerts.map((alert) => ({
        id: alert.id,
        alertType: alert.alertType,
        officerMessage: alert.officerMessage,
        contextKey: alert.contextKey,
        readAt: alert.readAt?.toISOString() ?? null,
        createdAt: alert.createdAt.toISOString(),
      })),
      unreadCount,
      summary: profile ? this.buildSummary(profile) : [],
      isFullyVerified: profile ? isProfileFullyVerified(profile) : false,
    };
  }

  async dismissAlerts(userId: string, alertIds?: string[]) {
    const where = {
      userId,
      readAt: null,
      ...(alertIds?.length ? { id: { in: alertIds } } : {}),
    };

    const result = await this.prisma.verificationAlert.updateMany({
      where,
      data: { readAt: new Date() },
    });

    return { dismissed: result.count };
  }

  buildSummary(
    profile: Pick<
      Profile,
      | 'profileBiodataReviewStatus'
      | 'nidVerifiedAt'
      | 'creatorNidVerifiedAt'
      | 'creationMode'
    > & {
      photos: Pick<ProfilePhoto, 'id' | 'type' | 'status'>[];
      nidDocuments: Pick<NidDocument, 'side' | 'status' | 'subject'>[];
    },
  ): VerificationSummaryItem[] {
    const items: VerificationSummaryItem[] = [];

    items.push({
      category: 'biodata',
      labelKey: 'biodata',
      status: this.mapBiodataStatus(profile.profileBiodataReviewStatus),
      needsAction: profile.profileBiodataReviewStatus === MediaReviewStatus.rejected,
    });

    items.push({
      category: 'nid',
      labelKey: 'nid',
      status: this.mapNidStatus(profile),
      needsAction: this.mapNidStatus(profile) === 'rejected',
    });

    const primary = profile.photos.find(
      (photo) => photo.type === ProfilePhotoType.primary,
    );
    items.push({
      category: 'photo',
      labelKey: 'photoPrimary',
      status: primary
        ? this.mapMediaStatus(primary.status)
        : 'not_submitted',
      needsAction: primary?.status === MediaReviewStatus.rejected,
      photoId: primary?.id,
      photoType: 'primary',
    });

    const seenGalleryPhotoIds = new Set<string>();
    for (const photo of profile.photos.filter(
      (entry) => entry.type === ProfilePhotoType.gallery,
    )) {
      if (photo.id === primary?.id || seenGalleryPhotoIds.has(photo.id)) {
        continue;
      }
      seenGalleryPhotoIds.add(photo.id);
      items.push({
        category: 'photo',
        labelKey: 'photoGallery',
        status: this.mapMediaStatus(photo.status),
        needsAction: photo.status === MediaReviewStatus.rejected,
        photoId: photo.id,
        photoType: 'gallery',
      });
    }

    return items;
  }

  private mapBiodataStatus(
    status: MediaReviewStatus | null,
  ): VerificationSummaryItem['status'] {
    if (!status) return 'not_submitted';
    if (status === MediaReviewStatus.approved) return 'approved';
    if (status === MediaReviewStatus.rejected) return 'rejected';
    return 'pending';
  }

  private mapMediaStatus(
    status: MediaReviewStatus,
  ): VerificationSummaryItem['status'] {
    if (status === MediaReviewStatus.approved) return 'approved';
    if (status === MediaReviewStatus.rejected) return 'rejected';
    return 'pending';
  }

  private mapNidStatus(
    profile: Pick<
      Profile,
      'nidVerifiedAt' | 'creatorNidVerifiedAt' | 'creationMode'
    > & {
      nidDocuments: Pick<NidDocument, 'side' | 'status' | 'subject'>[];
    },
  ): VerificationSummaryItem['status'] {
    const onBehalf = isOnBehalfProfile(profile);
    const subject = onBehalf
      ? NidDocumentSubject.creator
      : NidDocumentSubject.member;
    const verifiedAt = onBehalf
      ? profile.creatorNidVerifiedAt
      : profile.nidVerifiedAt;
    const scoped = profile.nidDocuments.filter((doc) => doc.subject === subject);

    if (verifiedAt) return 'approved';
    if (scoped.length === 0) return 'not_submitted';
    if (scoped.some((doc) => doc.status === MediaReviewStatus.rejected)) {
      return 'rejected';
    }

    const front = scoped.find((doc) => doc.side === NidDocumentSide.front);
    const back = scoped.find((doc) => doc.side === NidDocumentSide.back);
    if (!front || !back) return 'not_submitted';

    if (
      front.status === MediaReviewStatus.approved &&
      back.status === MediaReviewStatus.approved
    ) {
      return 'approved';
    }

    if (
      front.status === MediaReviewStatus.pending ||
      back.status === MediaReviewStatus.pending
    ) {
      return 'pending';
    }

    return 'not_submitted';
  }
}
