import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MediaReviewStatus,
  NidDocumentSide,
  NidDocumentSubject,
  ProfilePhotoType,
  Prisma,
} from '@prisma/client';
import { isOnBehalfProfile, type GallerySlot, resolveGalleryUploadSortOrder } from '@easymatch/shared';
import { StorageService } from '../storage/storage.service';
import {
  ALLOWED_NID_MIME_TYPES,
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_GALLERY_PHOTOS,
  MAX_NID_BYTES,
  MAX_PHOTO_BYTES,
} from '../storage/storage.constants';
import { PrismaService } from '../prisma/prisma.service';
import { generateUniqueProfileCode } from './profile-code.util';
import { VerificationAlertsService } from '../verification/verification-alerts.service';
import { StaffNotificationService } from '../staff/staff-notification.service';

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const MEDIA_SUMMARY_CACHE_TTL_MS = 30_000;

const profileMediaInclude = {
  photos: {
    orderBy: [
      { type: 'asc' as const },
      { sortOrder: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
  },
  nidDocuments: true,
} satisfies Prisma.ProfileInclude;

type ProfileWithMedia = Prisma.ProfileGetPayload<{
  include: typeof profileMediaInclude;
}>;

type MediaSummaryResponse = {
  creationMode: ProfileWithMedia['creationMode'];
  onBehalfRelation: ProfileWithMedia['onBehalfRelation'];
  isVerified: boolean;
  verifiedOnBehalf: boolean;
  nidVerifiedAt: Date | null;
  creatorNidVerifiedAt: Date | null;
  profileBiodataReviewStatus: MediaReviewStatus | null;
  profileBiodataReviewedAt: Date | null;
  photos: Array<{
    id: string;
    type: ProfilePhotoType;
    mimeType: string;
    fileSize: number;
    sortOrder: number;
    status: MediaReviewStatus;
    createdAt: string;
  }>;
  nidDocuments: Array<{
    id: string;
    side: NidDocumentSide;
    subject: NidDocumentSubject;
    mimeType: string;
    fileSize: number;
    status: MediaReviewStatus;
    submittedAt: string;
    reviewedAt: string | null;
  }>;
  nidStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  creatorNidStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected' | null;
  verificationFeedback: Awaited<
    ReturnType<VerificationAlertsService['getFeedback']>
  >;
};

@Injectable()
export class MediaService {
  private readonly mediaSummaryCache = new Map<
    string,
    { expiresAt: number; value: MediaSummaryResponse }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly verificationAlerts: VerificationAlertsService,
    private readonly staffNotifications: StaffNotificationService,
  ) {}

  async getMediaSummary(userId: string): Promise<MediaSummaryResponse> {
    const cached = this.mediaSummaryCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const profile = await this.ensureProfileWithMedia(userId);
    const feedback = await this.verificationAlerts.getFeedbackForProfile(
      profile,
      userId,
    );

    const payload = {
      creationMode: profile.creationMode,
      onBehalfRelation: profile.onBehalfRelation,
      isVerified: profile.isVerified,
      verifiedOnBehalf: profile.verifiedOnBehalf,
      nidVerifiedAt: profile.nidVerifiedAt,
      creatorNidVerifiedAt: profile.creatorNidVerifiedAt,
      profileBiodataReviewStatus: profile.profileBiodataReviewStatus,
      profileBiodataReviewedAt: profile.profileBiodataReviewedAt,
      photos: profile.photos.map((photo) => this.toPhotoDto(photo)),
      nidDocuments: profile.nidDocuments.map((doc) => this.toNidDto(doc)),
      nidStatus: this.resolveNidStatus(
        profile,
        profile.nidDocuments,
        NidDocumentSubject.member,
      ),
      creatorNidStatus: isOnBehalfProfile(profile)
        ? this.resolveNidStatus(
            profile,
            profile.nidDocuments,
            NidDocumentSubject.creator,
          )
        : null,
      verificationFeedback: feedback,
    };

    this.mediaSummaryCache.set(userId, {
      expiresAt: Date.now() + MEDIA_SUMMARY_CACHE_TTL_MS,
      value: payload,
    });

    return payload;
  }

  getVerificationFeedback(userId: string) {
    return this.verificationAlerts.getFeedback(userId);
  }

  dismissVerificationAlerts(userId: string, alertIds?: string[]) {
    return this.verificationAlerts.dismissAlerts(userId, alertIds);
  }

  async submitForVerification(userId: string) {
    const profile = await this.ensureProfile(userId);
    if (!profile.creationMode) {
      throw new BadRequestException(
        'Choose who this profile is for before submitting for verification',
      );
    }

    const photos = await this.prisma.profilePhoto.findMany({
      where: { profileId: profile.id },
    });
    const nidDocuments = await this.prisma.nidDocument.findMany({
      where: { profileId: profile.id },
    });

    if (!photos.some((photo) => photo.type === ProfilePhotoType.primary)) {
      throw new BadRequestException('Passport-size photo is required');
    }

    const onBehalf = isOnBehalfProfile(profile);
    const requiredSubject = onBehalf
      ? NidDocumentSubject.creator
      : NidDocumentSubject.member;
    const requiredDocs = nidDocuments.filter(
      (doc) => doc.subject === requiredSubject,
    );

    if (!requiredDocs.some((doc) => doc.side === NidDocumentSide.front)) {
      throw new BadRequestException(
        onBehalf
          ? 'Creator NID front side is required'
          : 'NID front side is required',
      );
    }
    if (!requiredDocs.some((doc) => doc.side === NidDocumentSide.back)) {
      throw new BadRequestException(
        onBehalf
          ? 'Creator NID back side is required'
          : 'NID back side is required',
      );
    }

    const subjectsToCheck = onBehalf
      ? [NidDocumentSubject.creator, NidDocumentSubject.member]
      : [NidDocumentSubject.member];
    for (const subject of subjectsToCheck) {
      const subjectDocs = nidDocuments.filter((doc) => doc.subject === subject);
      if (
        subjectDocs.some((doc) => doc.status === MediaReviewStatus.rejected)
      ) {
        throw new BadRequestException(
          subject === NidDocumentSubject.creator
            ? 'Re-upload the rejected creator NID documents before resubmitting'
            : 'Re-upload your rejected NID documents before resubmitting',
        );
      }
    }

    const verifiedAt = onBehalf
      ? profile.creatorNidVerifiedAt
      : profile.nidVerifiedAt;
    const allRequiredNidPending = requiredDocs.every(
      (doc) => doc.status === MediaReviewStatus.pending,
    );

    if (
      profile.profileBiodataReviewStatus === MediaReviewStatus.approved &&
      !verifiedAt &&
      allRequiredNidPending
    ) {
      void this.staffNotifications.notifyVerificationSubmission({
        profileId: profile.id,
        profileCode: profile.profileCode,
        detail: 'NID resubmit',
      });
      return {
        submitted: true,
        profileBiodataReviewStatus: profile.profileBiodataReviewStatus,
      };
    }

    if (profile.profileBiodataReviewStatus === MediaReviewStatus.approved) {
      throw new BadRequestException(
        'Re-upload any rejected documents before resubmitting for verification',
      );
    }

    if (profile.profileBiodataReviewStatus === MediaReviewStatus.pending) {
      return {
        submitted: true,
        profileBiodataReviewStatus: profile.profileBiodataReviewStatus,
      };
    }

    const updated = await this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        profileBiodataReviewStatus: MediaReviewStatus.pending,
        profileBiodataReviewedAt: null,
      },
      select: {
        profileBiodataReviewStatus: true,
      },
    });

    this.invalidateMediaSummaryCache(userId);
    void this.staffNotifications.notifyVerificationSubmission({
      profileId: profile.id,
      profileCode: profile.profileCode,
      detail: 'biodata',
    });
    return {
      submitted: true,
      profileBiodataReviewStatus: updated.profileBiodataReviewStatus,
    };
  }

  async uploadPhoto(
    userId: string,
    file: UploadedFile,
    type: ProfilePhotoType,
    gallerySlot?: GallerySlot,
  ) {
    this.assertPhotoFile(file);
    const profile = await this.ensureProfile(userId);

    if (type === ProfilePhotoType.primary) {
      const existingPrimary = await this.prisma.profilePhoto.findFirst({
        where: { profileId: profile.id, type: ProfilePhotoType.primary },
      });
      if (existingPrimary) {
        await this.deletePhotoRecord(existingPrimary.id, profile.id);
      }
    } else {
      const existingGallery = await this.prisma.profilePhoto.findMany({
        where: { profileId: profile.id, type: ProfilePhotoType.gallery },
        select: { id: true, sortOrder: true },
      });
      if (existingGallery.length >= MAX_GALLERY_PHOTOS) {
        throw new BadRequestException(
          `You can upload up to ${MAX_GALLERY_PHOTOS} gallery photos`,
        );
      }

      const sortOrder = gallerySlot
        ? resolveGalleryUploadSortOrder(gallerySlot, existingGallery)
        : existingGallery.length;

      if (gallerySlot === 'other') {
        const existingOther = existingGallery.find(
          (photo) => photo.sortOrder === 0,
        );
        if (existingOther) {
          await this.deletePhotoRecord(existingOther.id, profile.id);
        }
      }

      const storageKey = this.storage.save(userId, 'photos', file.buffer, file.mimetype);
      const photo = await this.prisma.profilePhoto.create({
        data: {
          profileId: profile.id,
          type,
          storageKey,
          mimeType: file.mimetype,
          fileSize: file.size,
          sortOrder,
          status: MediaReviewStatus.pending,
        },
      });

      this.invalidateMediaSummaryCache(userId);
      void this.staffNotifications.notifyVerificationSubmission({
        profileId: profile.id,
        profileCode: profile.profileCode,
        detail: `photo (${type})`,
      });
      return this.toPhotoDto(photo);
    }

    const storageKey = this.storage.save(userId, 'photos', file.buffer, file.mimetype);
    const photo = await this.prisma.profilePhoto.create({
      data: {
        profileId: profile.id,
        type,
        storageKey,
        mimeType: file.mimetype,
        fileSize: file.size,
        sortOrder: 0,
        status: MediaReviewStatus.pending,
      },
    });

    this.invalidateMediaSummaryCache(userId);
    void this.staffNotifications.notifyVerificationSubmission({
      profileId: profile.id,
      profileCode: profile.profileCode,
      detail: `photo (${type})`,
    });
    return this.toPhotoDto(photo);
  }

  async deletePhoto(userId: string, photoId: string) {
    const profile = await this.ensureProfile(userId);
    await this.deletePhotoRecord(photoId, profile.id);
    this.invalidateMediaSummaryCache(userId);
    return { deleted: true };
  }

  async setPrimaryPhoto(userId: string, photoId: string) {
    const profile = await this.ensureProfile(userId);
    const photo = await this.prisma.profilePhoto.findFirst({
      where: { id: photoId, profileId: profile.id },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    const existingPrimary = await this.prisma.profilePhoto.findFirst({
      where: { profileId: profile.id, type: ProfilePhotoType.primary },
    });

    if (existingPrimary && existingPrimary.id !== photo.id) {
      await this.prisma.profilePhoto.update({
        where: { id: existingPrimary.id },
        data: { type: ProfilePhotoType.gallery },
      });
    }

    const updated = await this.prisma.profilePhoto.update({
      where: { id: photo.id },
      data: { type: ProfilePhotoType.primary, sortOrder: 0 },
    });

    this.invalidateMediaSummaryCache(userId);
    return this.toPhotoDto(updated);
  }

  async uploadNid(
    userId: string,
    file: UploadedFile,
    side: NidDocumentSide,
    subject: NidDocumentSubject = NidDocumentSubject.member,
  ) {
    this.assertNidFile(file);
    const profile = await this.ensureProfile(userId);
    if (!profile.creationMode) {
      throw new BadRequestException(
        'Choose who this profile is for before uploading NID',
      );
    }

    if (
      subject === NidDocumentSubject.creator &&
      !isOnBehalfProfile(profile)
    ) {
      throw new BadRequestException(
        'Creator NID is only required for on-behalf profiles',
      );
    }

    const verifiedAt =
      subject === NidDocumentSubject.creator
        ? profile.creatorNidVerifiedAt
        : profile.nidVerifiedAt;

    if (verifiedAt) {
      throw new BadRequestException(
        'NID documents cannot be changed after verification',
      );
    }

    const existing = await this.prisma.nidDocument.findUnique({
      where: {
        profileId_side_subject: {
          profileId: profile.id,
          side,
          subject,
        },
      },
    });

    if (existing) {
      this.storage.delete(existing.storageKey);
      await this.prisma.nidDocument.delete({ where: { id: existing.id } });
    }

    const storageKey = this.storage.save(userId, 'nid', file.buffer, file.mimetype);
    const document = await this.prisma.nidDocument.create({
      data: {
        profileId: profile.id,
        side,
        subject,
        storageKey,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: MediaReviewStatus.pending,
      },
    });

    await this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        isVerified: false,
        verifiedOnBehalf: false,
        ...(subject === NidDocumentSubject.creator
          ? { creatorNidVerifiedAt: null }
          : { nidVerifiedAt: null }),
      },
    });

    this.invalidateMediaSummaryCache(userId);
    void this.staffNotifications.notifyVerificationSubmission({
      profileId: profile.id,
      profileCode: profile.profileCode,
      detail: `NID (${subject}, ${side})`,
    });
    return this.toNidDto(document);
  }

  async deleteNid(
    userId: string,
    side: NidDocumentSide,
    subject: NidDocumentSubject = NidDocumentSubject.member,
  ) {
    const profile = await this.ensureProfile(userId);

    const verifiedAt =
      subject === NidDocumentSubject.creator
        ? profile.creatorNidVerifiedAt
        : profile.nidVerifiedAt;

    if (verifiedAt) {
      throw new BadRequestException(
        'NID documents cannot be changed after verification',
      );
    }

    const existing = await this.prisma.nidDocument.findUnique({
      where: {
        profileId_side_subject: {
          profileId: profile.id,
          side,
          subject,
        },
      },
    });
    if (!existing) {
      throw new NotFoundException('NID document not found');
    }

    this.storage.delete(existing.storageKey);
    await this.prisma.nidDocument.delete({ where: { id: existing.id } });

    this.invalidateMediaSummaryCache(userId);
    return { deleted: true };
  }

  async getPhotoFile(userId: string, photoId: string) {
    const profile = await this.ensureProfile(userId);
    const photo = await this.prisma.profilePhoto.findFirst({
      where: { id: photoId, profileId: profile.id },
    });
    if (!photo || !this.storage.exists(photo.storageKey)) {
      throw new NotFoundException('Photo not found');
    }
    return {
      stream: this.storage.createReadStream(photo.storageKey),
      mimeType: photo.mimeType,
    };
  }

  async getNidFile(
    userId: string,
    side: NidDocumentSide,
    subject: NidDocumentSubject = NidDocumentSubject.member,
  ) {
    const profile = await this.ensureProfile(userId);
    const document = await this.prisma.nidDocument.findUnique({
      where: {
        profileId_side_subject: {
          profileId: profile.id,
          side,
          subject,
        },
      },
    });
    if (!document || !this.storage.exists(document.storageKey)) {
      throw new NotFoundException('NID document not found');
    }
    return {
      stream: this.storage.createReadStream(document.storageKey),
      mimeType: document.mimeType,
    };
  }

  private async deletePhotoRecord(photoId: string, profileId: string) {
    const photo = await this.prisma.profilePhoto.findFirst({
      where: { id: photoId, profileId },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }
    this.storage.delete(photo.storageKey);
    await this.prisma.profilePhoto.delete({ where: { id: photo.id } });
  }

  private assertPhotoFile(file: UploadedFile) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Photo file is required');
    }
    if (!ALLOWED_PHOTO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Photo must be JPEG, PNG, or WebP');
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Photo must be 2 MB or smaller');
    }
  }

  private assertNidFile(file: UploadedFile) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('NID file is required');
    }
    if (!ALLOWED_NID_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('NID must be JPEG, PNG, WebP, or PDF');
    }
    if (file.size > MAX_NID_BYTES) {
      throw new BadRequestException('NID file must be 5 MB or smaller');
    }
  }

  private invalidateMediaSummaryCache(userId: string) {
    this.mediaSummaryCache.delete(userId);
  }

  /** Drop cached /profiles/me/media after officer review or verification changes. */
  clearMediaSummaryCacheForUser(userId: string) {
    this.invalidateMediaSummaryCache(userId);
  }

  private async ensureProfileWithMedia(userId: string): Promise<ProfileWithMedia> {
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: profileMediaInclude,
    });

    if (!profile) {
      const profileCode = await generateUniqueProfileCode(this.prisma);
      profile = await this.prisma.profile.create({
        data: { userId, profileCode },
        include: profileMediaInclude,
      });
    }

    return profile;
  }

  private async ensureProfile(userId: string) {
    let profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      const profileCode = await generateUniqueProfileCode(this.prisma);
      profile = await this.prisma.profile.create({ data: { userId, profileCode } });
    }
    return profile;
  }

  private resolveNidStatus(
    profile: {
      nidVerifiedAt: Date | null;
      creatorNidVerifiedAt: Date | null;
    },
    documents: {
      side: NidDocumentSide;
      status: MediaReviewStatus;
      subject: NidDocumentSubject;
    }[],
    subject: NidDocumentSubject,
  ): 'not_submitted' | 'pending' | 'verified' | 'rejected' {
    const verifiedAt =
      subject === NidDocumentSubject.creator
        ? profile.creatorNidVerifiedAt
        : profile.nidVerifiedAt;
    const scoped = documents.filter((doc) => doc.subject === subject);

    if (verifiedAt) return 'verified';
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
      return 'verified';
    }

    if (
      front.status === MediaReviewStatus.pending ||
      back.status === MediaReviewStatus.pending
    ) {
      return 'pending';
    }

    return 'not_submitted';
  }

  private toPhotoDto(photo: {
    id: string;
    type: ProfilePhotoType;
    mimeType: string;
    fileSize: number;
    sortOrder: number;
    status: MediaReviewStatus;
    createdAt: Date;
  }) {
    return {
      id: photo.id,
      type: photo.type,
      mimeType: photo.mimeType,
      fileSize: photo.fileSize,
      sortOrder: photo.sortOrder,
      status: photo.status,
      createdAt: photo.createdAt.toISOString(),
    };
  }

  private toNidDto(document: {
    id: string;
    side: NidDocumentSide;
    subject: NidDocumentSubject;
    mimeType: string;
    fileSize: number;
    status: MediaReviewStatus;
    submittedAt: Date;
    reviewedAt: Date | null;
  }) {
    return {
      id: document.id,
      side: document.side,
      subject: document.subject,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      status: document.status,
      submittedAt: document.submittedAt.toISOString(),
      reviewedAt: document.reviewedAt?.toISOString() ?? null,
    };
  }
}
