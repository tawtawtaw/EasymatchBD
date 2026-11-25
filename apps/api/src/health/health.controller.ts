import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
   * Temporary diagnostics for live Profile schema / read failures.
   * Safe: no PII, only column presence + whether findFirst works.
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
        message: error instanceof Error ? error.message : String(error),
      };
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

    const failed = Object.entries(probes).filter(([, value]) => value !== 'ok' && value !== 'empty');
    return {
      status: failed.length === 0 ? 'ok' : 'error',
      columns: columns.map((row) => row.column_name),
      enumValues,
      probes,
      failed: failed.map(([name, message]) => ({ name, message })),
      timestamp: new Date().toISOString(),
    };
  }
}
