import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  hasAcceptedCurrentTerms,
  isStaffAssistedProfile,
  isStaffRole,
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
  UserRole,
} from '@easymatch/shared';
import {
  NidDocumentSide,
  ProfileCreationMode,
  ProfilePhotoType,
  StaffActivityCategory,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { StaffAuditService } from '../audit/staff-audit.service';
import type { SmsProvider } from '../auth/sms/sms.provider';
import { SMS_PROVIDER } from '../auth/sms/sms.provider';
import { LegalService } from '../legal/legal.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateFamilyDto } from '../profiles/dto/update-family.dto';
import { UpdateMaritalDto } from '../profiles/dto/update-marital.dto';
import { UpdatePartnerDto } from '../profiles/dto/update-partner.dto';
import { UpdatePersonalDto } from '../profiles/dto/update-personal.dto';
import { generateUniqueProfileCode } from '../profiles/profile-code.util';
import { MediaService } from '../profiles/media.service';
import { ProfilesService } from '../profiles/profiles.service';
import { VerificationService } from './verification.service';

type StaffActor = { id: string; role: string };

@Injectable()
export class StaffAssistedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly media: MediaService,
    @Inject(forwardRef(() => VerificationService))
    private readonly verification: VerificationService,
    private readonly staffAudit: StaffAuditService,
    private readonly legal: LegalService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  async create(
    actor: StaffActor,
    input: { phone: string; consentNote: string; consentChannel?: string },
  ) {
    if (!isValidBangladeshPhone(input.phone)) {
      throw new BadRequestException('Invalid Bangladesh mobile number');
    }
    const phone = normalizeBangladeshPhone(input.phone);
    const consentNote = input.consentNote.trim();
    if (consentNote.length < 3) {
      throw new BadRequestException('Consent note is required');
    }

    const existing = await this.prisma.user.findUnique({
      where: { phone },
      include: { profile: { select: { id: true, profileCode: true } } },
    });

    if (existing) {
      if (isStaffRole(existing.role)) {
        throw new ConflictException(
          'This mobile number belongs to a staff account',
        );
      }
      if (!existing.isActive) {
        throw new ConflictException(
          'This mobile number belongs to a deactivated account',
        );
      }
      if (existing.profile) {
        throw new ConflictException(
          `A member profile already exists for this number (${existing.profile.profileCode})`,
        );
      }
    }

    const now = new Date();
    const profileCode = await generateUniqueProfileCode(this.prisma);
    const channel = input.consentChannel?.trim() || 'in_person';
    // Consent is captured on the staff PDF / intake note — treat platform T&C as accepted.
    const termsVersion = await this.legal.getCurrentVersion();

    const result = await this.prisma.$transaction(async (tx) => {
      const termsData = {
        termsAcceptedAt: now,
        termsVersion,
        termsDeclinedAt: null as Date | null,
      };

      let userId: string;
      if (!existing) {
        const created = await tx.user.create({
          data: {
            phone,
            role: PrismaUserRole.individual,
            ...termsData,
            subscription: { create: { plan: 'free' } },
          },
          select: { id: true },
        });
        userId = created.id;
      } else {
        userId = existing.id;
        if (
          !hasAcceptedCurrentTerms(
            existing.termsAcceptedAt,
            existing.termsVersion,
            termsVersion,
          )
        ) {
          await tx.user.update({
            where: { id: userId },
            data: termsData,
          });
        }
      }

      const profile = await tx.profile.create({
        data: {
          userId,
          profileCode,
          creationMode: ProfileCreationMode.staff_assisted,
          createdByStaffId: actor.id,
          consentNote,
          consentedAt: now,
        },
      });

      return { profile };
    });

    await this.staffAudit.log({
      actorId: actor.id,
      actorRole: actor.role,
      category: StaffActivityCategory.verification,
      action: 'staff_assisted.create',
      summary: `Created staff-assisted profile ${profileCode} for ${phone}`,
      httpMethod: 'POST',
      path: '/verification/staff-assisted',
      entityType: 'profile',
      entityId: result.profile.id,
      metadata: {
        phone,
        profileCode,
        consentChannel: channel,
        consentNote,
      },
    });

    return this.verification.getSubmission(result.profile.id);
  }

  async assertStaffAssistedProfile(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        userId: true,
        profileCode: true,
        creationMode: true,
        user: { select: { isActive: true } },
      },
    });
    if (!profile || !profile.user.isActive) {
      throw new NotFoundException('Profile not found');
    }
    if (!isStaffAssistedProfile(profile)) {
      throw new ForbiddenException(
        'This action is only allowed for staff-assisted profiles',
      );
    }
    return profile;
  }

  async updatePersonal(
    actor: StaffActor,
    profileId: string,
    dto: UpdatePersonalDto,
    reason?: string,
  ) {
    const profile = await this.assertStaffAssistedProfile(profileId);
    await this.profiles.updatePersonal(profile.userId, dto, {
      bypassNidNameLock: true,
    });
    await this.logEdit(actor, profile, 'personal', reason);
    return this.verification.getSubmission(profileId);
  }

  async updateFamily(
    actor: StaffActor,
    profileId: string,
    dto: UpdateFamilyDto,
    reason?: string,
  ) {
    const profile = await this.assertStaffAssistedProfile(profileId);
    await this.profiles.updateFamily(profile.userId, dto);
    await this.logEdit(actor, profile, 'family', reason);
    return this.verification.getSubmission(profileId);
  }

  async updatePartner(
    actor: StaffActor,
    profileId: string,
    dto: UpdatePartnerDto,
    reason?: string,
  ) {
    const profile = await this.assertStaffAssistedProfile(profileId);
    await this.profiles.updatePartner(profile.userId, dto);
    await this.logEdit(actor, profile, 'partner', reason);
    return this.verification.getSubmission(profileId);
  }

  async updateMarital(
    actor: StaffActor,
    profileId: string,
    dto: UpdateMaritalDto,
    reason?: string,
  ) {
    const profile = await this.assertStaffAssistedProfile(profileId);
    await this.profiles.updateMarital(profile.userId, dto);
    await this.logEdit(actor, profile, 'marital', reason);
    return this.verification.getSubmission(profileId);
  }

  async uploadPhoto(
    profileId: string,
    file: Express.Multer.File,
    type?: string,
    slot?: string,
  ) {
    const profile = await this.assertStaffAssistedProfile(profileId);
    return this.media.uploadPhoto(
      profile.userId,
      file,
      this.parsePhotoType(type),
      this.parseGallerySlot(slot),
    );
  }

  async uploadNid(
    profileId: string,
    file: Express.Multer.File,
    side: 'front' | 'back',
  ) {
    const profile = await this.assertStaffAssistedProfile(profileId);
    return this.media.uploadNid(
      profile.userId,
      file,
      side === 'back' ? NidDocumentSide.back : NidDocumentSide.front,
    );
  }

  async deletePhoto(profileId: string, photoId: string) {
    const profile = await this.assertStaffAssistedProfile(profileId);
    return this.media.deletePhoto(profile.userId, photoId);
  }

  async deleteNid(profileId: string, side: 'front' | 'back') {
    const profile = await this.assertStaffAssistedProfile(profileId);
    return this.media.deleteNid(
      profile.userId,
      side === 'back' ? NidDocumentSide.back : NidDocumentSide.front,
    );
  }

  async submit(actor: StaffActor, profileId: string) {
    const profile = await this.assertStaffAssistedProfile(profileId);
    const result = await this.media.submitForVerification(profile.userId);
    await this.staffAudit.log({
      actorId: actor.id,
      actorRole: actor.role,
      category: StaffActivityCategory.verification,
      action: 'staff_assisted.submit',
      summary: `Submitted staff-assisted profile ${profile.profileCode} for verification`,
      httpMethod: 'POST',
      path: `/verification/staff-assisted/${profileId}/submit`,
      entityType: 'profile',
      entityId: profileId,
      metadata: { profileCode: profile.profileCode },
    });
    return result;
  }

  async assertAdminCanApprove(
    actor: StaffActor,
    profileId: string,
    decision: 'approved' | 'rejected',
  ) {
    if (decision !== 'approved') return;
    if (actor.role === UserRole.SUPER_ADMIN) return;

    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { creationMode: true, profileCode: true },
    });
    if (profile && isStaffAssistedProfile(profile)) {
      throw new ForbiddenException(
        'Only Super Admin can approve staff-assisted profiles',
      );
    }
  }

  async sendInviteSmsIfNeeded(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        profileCode: true,
        creationMode: true,
        isVerified: true,
        staffInviteSmsSentAt: true,
        createdByStaffId: true,
        user: { select: { phone: true } },
      },
    });
    if (!profile || !isStaffAssistedProfile(profile) || !profile.isVerified) {
      return;
    }
    if (profile.staffInviteSmsSentAt || !profile.user.phone) {
      return;
    }
    if (!this.sms.sendText) {
      return;
    }

    // Keep under one RTCom segment (~160 GSM chars).
    const message = `EasyMatchBD: Profile ${profile.profileCode} live. Login: easymatchbd.com`;

    try {
      await this.sms.sendText(profile.user.phone, message);
      await this.prisma.profile.update({
        where: { id: profileId },
        data: { staffInviteSmsSentAt: new Date() },
      });
      if (profile.createdByStaffId) {
        await this.staffAudit.log({
          actorId: profile.createdByStaffId,
          actorRole: UserRole.VERIFICATION_OFFICER,
          category: StaffActivityCategory.verification,
          action: 'staff_assisted.invite_sms',
          summary: `Sent staff-assisted invite SMS for profile ${profile.profileCode}`,
          entityType: 'profile',
          entityId: profileId,
          metadata: {
            profileCode: profile.profileCode,
            phone: profile.user.phone,
          },
        });
      }
    } catch (err) {
      // Invite SMS must not roll back verification approval.
      console.warn(
        `Staff-assisted invite SMS failed for ${profile.profileCode}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async logEdit(
    actor: StaffActor,
    profile: { id: string; profileCode: string | null },
    section: string,
    reason?: string,
  ) {
    const reasonText = reason?.trim() || null;
    await this.staffAudit.log({
      actorId: actor.id,
      actorRole: actor.role,
      category: StaffActivityCategory.verification,
      action: `staff_assisted.edit.${section}`,
      summary: `Updated ${section} on staff-assisted profile ${profile.profileCode ?? profile.id}${reasonText ? ` — ${reasonText}` : ''}`,
      httpMethod: 'PUT',
      path: `/verification/staff-assisted/${profile.id}/${section}`,
      entityType: 'profile',
      entityId: profile.id,
      metadata: {
        section,
        profileCode: profile.profileCode,
        reason: reasonText,
      },
    });
  }

  private parsePhotoType(type?: string) {
    if (type === 'gallery') return ProfilePhotoType.gallery;
    return ProfilePhotoType.primary;
  }

  private parseGallerySlot(slot?: string): 'other' | 'family' | undefined {
    if (slot === 'other' || slot === 'family') return slot;
    return undefined;
  }
}
