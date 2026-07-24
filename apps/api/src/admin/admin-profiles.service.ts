import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { isPaidMember, isStaffRole, isValidProfileCode, normalizeProfileCode, UserRole } from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';

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
  ) {}

  async getMemberProfile(profileId: string) {
    return this.verification.getSubmission(profileId);
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
