import { Controller, Get } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildVerificationBiodataChanges,
  type VerificationBiodataSnapshot,
} from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildVerificationBiodataSnapshotFromProfile,
  parseStoredVerificationBiodataSnapshot,
} from '../verification/verification-biodata-snapshot';

const myProfileInclude = {
  familyInfo: true,
  siblings: true,
  paternalRelatives: true,
  maternalRelatives: true,
  partnerPreference: true,
  photos: {
    orderBy: [
      { type: 'asc' as const },
      { sortOrder: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
  },
  nidDocuments: true,
} satisfies Prisma.ProfileInclude;

const submissionInclude = {
  user: {
    select: { id: true, phone: true, phoneVerifiedAt: true, isActive: true },
  },
  familyInfo: true,
  siblings: true,
  paternalRelatives: true,
  maternalRelatives: true,
  partnerPreference: true,
  photos: { orderBy: [{ type: 'asc' as const }, { sortOrder: 'asc' as const }] },
  nidDocuments: { orderBy: { side: 'asc' as const } },
} satisfies Prisma.ProfileInclude;

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Temporary diagnostics for live Profile / Connection schema and auth-gated
   * read shapes. Safe: no PII in the response body.
   */
  @Get('profile-schema')
  async profileSchema() {
    const columns = await this.prisma.$queryRaw<
      Array<{ column_name: string }>
    >`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Profile'
        AND column_name IN (
          'createdByStaffId',
          'consentNote',
          'consentedAt',
          'staffInviteSmsSentAt'
        )
      ORDER BY column_name
    `;

    const connectionColumns = await this.prisma.$queryRaw<
      Array<{ column_name: string }>
    >`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Connection'
        AND column_name IN ('endedAt', 'endedById')
      ORDER BY column_name
    `;

    let enumValues: string[] = [];
    try {
      const rows = await this.prisma.$queryRaw<Array<{ enumlabel: string }>>`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'ProfileCreationMode'
        ORDER BY e.enumsortorder
      `;
      enumValues = rows.map((row) => row.enumlabel);
    } catch (error) {
      return {
        status: 'error',
        stage: 'enum',
        columns: columns.map((row) => row.column_name),
        connectionColumns: connectionColumns.map((row) => row.column_name),
        message: error instanceof Error ? error.message : String(error),
      };
    }

    let interestEnumValues: string[] = [];
    try {
      const rows = await this.prisma.$queryRaw<Array<{ enumlabel: string }>>`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'InterestStatus'
        ORDER BY e.enumsortorder
      `;
      interestEnumValues = rows.map((row) => row.enumlabel);
    } catch (error) {
      interestEnumValues = [
        `error:${error instanceof Error ? error.message : String(error)}`,
      ];
    }

    const probes: Record<string, string> = {};

    try {
      const sample = await this.prisma.profile.findFirst({
        select: {
          id: true,
          creationMode: true,
          createdByStaffId: true,
          staffInviteSmsSentAt: true,
        },
      });
      probes.findFirst = sample ? 'ok' : 'empty';
    } catch (error) {
      probes.findFirst =
        error instanceof Error ? error.message : String(error);
    }

    try {
      await this.prisma.profile.findFirst({
        include: myProfileInclude,
      });
      probes.myProfileInclude = 'ok';
    } catch (error) {
      probes.myProfileInclude =
        error instanceof Error ? error.message : String(error);
    }

    try {
      await this.prisma.profile.findMany({
        where: {
          user: { isActive: true },
          profileBiodataReviewStatus: 'pending',
        },
        include: {
          user: { select: { id: true, phone: true } },
          photos: {
            where: { status: 'pending' },
            orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
          },
          nidDocuments: true,
        },
        take: 3,
      });
      probes.verificationQueue = 'ok';
    } catch (error) {
      probes.verificationQueue =
        error instanceof Error ? error.message : String(error);
    }

    try {
      const pending = await this.prisma.profile.findFirst({
        where: {
          user: { isActive: true },
          profileBiodataReviewStatus: 'pending',
        },
        include: submissionInclude,
      });
      if (!pending) {
        probes.verificationSubmission = 'empty';
      } else {
        const currentSnapshot =
          buildVerificationBiodataSnapshotFromProfile(pending);
        const previousSnapshot = parseStoredVerificationBiodataSnapshot(
          pending.profileBiodataApprovedSnapshot,
        );
        buildVerificationBiodataChanges(
          currentSnapshot as VerificationBiodataSnapshot,
          previousSnapshot,
        );
        // Touch staff-assisted scalars the submission DTO returns.
        void pending.createdByStaffId;
        void pending.consentNote;
        void pending.consentedAt;
        void pending.staffInviteSmsSentAt;
        probes.verificationSubmission = 'ok';
      }
    } catch (error) {
      probes.verificationSubmission =
        error instanceof Error ? error.message : String(error);
    }

    try {
      await this.prisma.user.findMany({
        where: { isActive: true },
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
        take: 3,
      });
      probes.adminList = 'ok';
    } catch (error) {
      probes.adminList =
        error instanceof Error ? error.message : String(error);
    }

    try {
      await this.prisma.user.findFirst({
        select: {
          id: true,
          termsAcceptedAt: true,
          termsVersion: true,
          profile: {
            select: {
              id: true,
              isVerified: true,
              creationMode: true,
            },
          },
          subscription: {
            select: { plan: true, isActive: true, endsAt: true },
          },
        },
      });
      probes.authMeShape = 'ok';
    } catch (error) {
      probes.authMeShape =
        error instanceof Error ? error.message : String(error);
    }

    try {
      await this.prisma.connection.findFirst({
        select: { id: true, endedAt: true, endedById: true },
      });
      probes.connectionEnded = 'ok';
    } catch (error) {
      probes.connectionEnded =
        error instanceof Error ? error.message : String(error);
    }

    try {
      await this.prisma.verificationAlert.findMany({
        take: 1,
        select: {
          id: true,
          alertType: true,
          officerMessage: true,
          contextKey: true,
          readAt: true,
          createdAt: true,
        },
      });
      probes.verificationFeedback = 'ok';
    } catch (error) {
      probes.verificationFeedback =
        error instanceof Error ? error.message : String(error);
    }

    const failed = Object.entries(probes).filter(
      ([, value]) => value !== 'ok' && value !== 'empty',
    );
    return {
      status: failed.length === 0 ? 'ok' : 'error',
      columns: columns.map((row) => row.column_name),
      connectionColumns: connectionColumns.map((row) => row.column_name),
      enumValues,
      interestEnumValues,
      probes,
      failed: failed.map(([name, message]) => ({ name, message })),
      timestamp: new Date().toISOString(),
    };
  }
}
