import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MediaReviewStatus,
  Prisma,
  StaffActivityCategory,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  isPaidMember,
  isStaffRole,
  isValidProfileCode,
  normalizeProfileCode,
  UserRole,
} from '@easymatch/shared';
import { StaffAuditService } from '../audit/staff-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateFamilyDto } from '../profiles/dto/update-family.dto';
import { UpdateMaritalDto } from '../profiles/dto/update-marital.dto';
import { UpdatePartnerDto } from '../profiles/dto/update-partner.dto';
import { UpdatePersonalDto } from '../profiles/dto/update-personal.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { buildVerificationBiodataSnapshotFromProfile } from '../verification/verification-biodata-snapshot';
import { VerificationService } from '../verification/verification.service';

export type AdminBiodataSection = 'personal' | 'family' | 'partner' | 'marital';

type AdminActor = { id: string; role: string };

const MEMBER_ROLES: PrismaUserRole[] = [
  PrismaUserRole.individual,
  PrismaUserRole.parent_guardian,
  PrismaUserRole.premium_member,
];

const STAFF_ROLES: PrismaUserRole[] = [
  PrismaUserRole.marriage_consultant,
  PrismaUserRole.verification_officer,
  PrismaUserRole.super_admin,
  PrismaUserRole.support_agent,
];

export type AdminProfileKind = 'member' | 'staff';

export type AdminProfilesQuery = {
  page?: number;
  limit?: number;
  q?: string;
  kind?: AdminProfileKind | 'all';
  role?: string;
  includeInactive?: boolean;
};

@Injectable()
export class AdminProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: VerificationService,
    private readonly profiles: ProfilesService,
    private readonly staffAudit: StaffAuditService,
  ) {}

  async getMemberProfile(profileId: string) {
    return this.verification.getSubmission(profileId);
  }

  async updateMemberPersonal(
    actor: AdminActor,
    profileId: string,
    dto: UpdatePersonalDto,
    reason?: string,
  ) {
    return this.updateMemberSection(actor, profileId, 'personal', reason, async (userId) => {
      await this.profiles.updatePersonal(userId, dto, {
        bypassNidNameLock: true,
      });
    });
  }

  async updateMemberFamily(
    actor: AdminActor,
    profileId: string,
    dto: UpdateFamilyDto,
    reason?: string,
  ) {
    return this.updateMemberSection(actor, profileId, 'family', reason, async (userId) => {
      await this.profiles.updateFamily(userId, dto);
    });
  }

  async updateMemberPartner(
    actor: AdminActor,
    profileId: string,
    dto: UpdatePartnerDto,
    reason?: string,
  ) {
    return this.updateMemberSection(actor, profileId, 'partner', reason, async (userId) => {
      await this.profiles.updatePartner(userId, dto);
    });
  }

  async updateMemberMarital(
    actor: AdminActor,
    profileId: string,
    dto: UpdateMaritalDto,
    reason?: string,
  ) {
    return this.updateMemberSection(actor, profileId, 'marital', reason, async (userId) => {
      await this.profiles.updateMarital(userId, dto);
    });
  }

  private async updateMemberSection(
    actor: AdminActor,
    profileId: string,
    section: AdminBiodataSection,
    reason: string | undefined,
    apply: (userId: string) => Promise<void>,
  ) {
    const beforeSubmission = (await this.verification.getSubmission(
      profileId,
    )) as Record<string, unknown>;
    const userId = String(beforeSubmission.userId);
    const beforeSlice = this.sectionSlice(beforeSubmission, section);

    await apply(userId);

    // Keep verification status; refresh approved snapshot so VO change highlights stay accurate.
    await this.refreshApprovedBiodataSnapshotIfNeeded(profileId);

    const afterSubmission = (await this.verification.getSubmission(
      profileId,
    )) as Record<string, unknown>;
    const afterSlice = this.sectionSlice(afterSubmission, section);
    const changes = diffJson(beforeSlice, afterSlice);

    const profileCode =
      typeof afterSubmission.profileCode === 'string'
        ? afterSubmission.profileCode
        : profileId;
    const reasonText = reason?.trim() || null;
    const changeCount = changes.length;
    const summary = `Admin updated ${section} biodata for profile ${profileCode} (${changeCount} field${changeCount === 1 ? '' : 's'})${reasonText ? ` — ${reasonText}` : ''}`;

    await this.staffAudit.log({
      actorId: actor.id,
      actorRole: actor.role,
      category: StaffActivityCategory.admin,
      action: `biodata.admin_edit.${section}`,
      summary: summary.slice(0, 500),
      httpMethod: 'PUT',
      path: `/admin/profiles/members/${profileId}/${section}`,
      entityType: 'profile',
      entityId: profileId,
      metadata: {
        section,
        profileCode,
        reason: reasonText,
        changeCount,
        changes: changes.slice(0, 100),
        verificationKept: true,
      },
    });

    return afterSubmission;
  }

  private sectionSlice(
    submission: Record<string, unknown>,
    section: AdminBiodataSection,
  ): unknown {
    switch (section) {
      case 'personal':
        return submission.personal ?? null;
      case 'marital':
        return submission.marital ?? null;
      case 'partner':
        return submission.partnerPreference ?? null;
      case 'family':
        return {
          familyInfo: submission.familyInfo ?? null,
          siblings: submission.siblings ?? [],
          paternalRelatives: submission.paternalRelatives ?? [],
          maternalRelatives: submission.maternalRelatives ?? [],
        };
      default:
        return null;
    }
  }

  private async refreshApprovedBiodataSnapshotIfNeeded(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        familyInfo: true,
        siblings: true,
        paternalRelatives: true,
        maternalRelatives: true,
        partnerPreference: true,
      },
    });
    if (!profile) return;
    if (profile.profileBiodataReviewStatus !== MediaReviewStatus.approved) {
      return;
    }
    const snapshot = buildVerificationBiodataSnapshotFromProfile(profile);
    await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        profileBiodataApprovedSnapshot: snapshot as Prisma.InputJsonValue,
      },
    });
  }

  async listProfiles(query: AdminProfilesQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const skip = (page - 1) * limit;
    const kind = query.kind ?? 'all';

    const where = this.buildUserWhere(
      query.q,
      kind,
      query.role,
      query.includeInactive,
    );

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          profile: {
            select: {
              id: true,
              profileCode: true,
              fullName: true,
              isVerified: true,
              updatedAt: true,
            },
          },
          staffProfile: {
            select: {
              id: true,
              fullName: true,
              email: true,
              designation: true,
              officeDistrict: true,
              updatedAt: true,
            },
          },
          subscription: {
            select: { plan: true, isActive: true, endsAt: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((user) => this.toListItem(user)),
      total,
      page,
      limit,
    };
  }

  async getStaffProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staffProfile: true },
    });

    if (!user || !isStaffRole(user.role)) {
      throw new NotFoundException('Staff profile not found');
    }

    const staffProfile = user.staffProfile;

    return {
      userId: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      staffProfile: staffProfile
        ? {
            id: staffProfile.id,
            fullName: staffProfile.fullName,
            email: staffProfile.email,
            employeeId: staffProfile.employeeId,
            designation: staffProfile.designation,
            officeDivision: staffProfile.officeDivision,
            officeDistrict: staffProfile.officeDistrict,
            officeAddressLine: staffProfile.officeAddressLine,
            notes: staffProfile.notes,
            createdAt: staffProfile.createdAt.toISOString(),
            updatedAt: staffProfile.updatedAt.toISOString(),
          }
        : null,
    };
  }

  private buildUserWhere(
    q: string | undefined,
    kind: AdminProfileKind | 'all',
    role: string | undefined,
    includeInactive = false,
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (kind === 'member') {
      where.role = { in: MEMBER_ROLES };
    } else if (kind === 'staff') {
      where.role = { in: STAFF_ROLES };
    }

    if (role && Object.values(UserRole).includes(role as UserRole)) {
      where.role = role as PrismaUserRole;
    }

    const term = q?.trim();
    if (term) {
      const or: Prisma.UserWhereInput[] = [
        { phone: { contains: term } },
        { email: { contains: term, mode: 'insensitive' } },
        {
          profile: {
            fullName: { contains: term, mode: 'insensitive' },
          },
        },
        {
          staffProfile: {
            fullName: { contains: term, mode: 'insensitive' },
          },
        },
        {
          staffProfile: {
            email: { contains: term, mode: 'insensitive' },
          },
        },
      ];

      if (isValidProfileCode(term)) {
        or.push({
          profile: { profileCode: normalizeProfileCode(term) },
        });
      }

      where.OR = or;
    }

    return where;
  }

  private toListItem(
    user: Prisma.UserGetPayload<{
      include: {
        profile: {
          select: {
            id: true;
            profileCode: true;
            fullName: true;
            isVerified: true;
            updatedAt: true;
          };
        };
        staffProfile: {
          select: {
            id: true;
            fullName: true;
            email: true;
            designation: true;
            officeDistrict: true;
            updatedAt: true;
          };
        };
        subscription: {
          select: { plan: true; isActive: true; endsAt: true };
        };
      };
    }>,
  ) {
    const isStaff = isStaffRole(user.role);

    return {
      userId: user.id,
      kind: isStaff ? ('staff' as const) : ('member' as const),
      role: user.role,
      phone: user.phone,
      email: user.email ?? user.staffProfile?.email ?? null,
      isActive: user.isActive,
      profileId: user.profile?.id ?? null,
      profileCode: user.profile?.profileCode ?? null,
      fullName: isStaff
        ? user.staffProfile?.fullName
        : user.profile?.fullName,
      designation: user.staffProfile?.designation ?? null,
      officeDistrict: user.staffProfile?.officeDistrict ?? null,
      isVerified: user.profile?.isVerified ?? null,
      subscriptionPlan: user.subscription?.plan ?? 'free',
      isPaidMember: isPaidMember(user.subscription),
      updatedAt: (
        isStaff
          ? user.staffProfile?.updatedAt
          : user.profile?.updatedAt
      )?.toISOString() ?? user.updatedAt.toISOString(),
    };
  }
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`).join(',')}}`;
}

function diffJson(
  before: unknown,
  after: unknown,
  path = '',
): Array<{ field: string; from: unknown; to: unknown }> {
  if (stableSerialize(before) === stableSerialize(after)) {
    return [];
  }

  const beforeIsObj =
    before !== null && typeof before === 'object' && !Array.isArray(before);
  const afterIsObj =
    after !== null && typeof after === 'object' && !Array.isArray(after);

  if (beforeIsObj || afterIsObj) {
    const beforeObj = (beforeIsObj ? before : {}) as Record<string, unknown>;
    const afterObj = (afterIsObj ? after : {}) as Record<string, unknown>;
    const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
    const changes: Array<{ field: string; from: unknown; to: unknown }> = [];
    for (const key of keys) {
      const nextPath = path ? `${path}.${key}` : key;
      changes.push(...diffJson(beforeObj[key], afterObj[key], nextPath));
    }
    return changes;
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    return [
      {
        field: path || '(root)',
        from: before ?? null,
        to: after ?? null,
      },
    ];
  }

  return [
    {
      field: path || '(root)',
      from: before ?? null,
      to: after ?? null,
    },
  ];
}
