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

    try {
      const sample = await this.prisma.profile.findFirst({
        select: {
          id: true,
          creationMode: true,
          createdByStaffId: true,
          staffInviteSmsSentAt: true,
        },
      });
      return {
        status: 'ok',
        columns: columns.map((row) => row.column_name),
        enumValues,
        sampleFound: Boolean(sample),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        stage: 'findFirst',
        columns: columns.map((row) => row.column_name),
        enumValues,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
