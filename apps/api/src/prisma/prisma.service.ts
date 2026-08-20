import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ensureConnectionEndedSchema } from './ensure-connection-ended-schema';
import { ensureMembershipTariffDiscountSchema } from './ensure-membership-tariff-discount-schema';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logDatabaseTarget();
    const connected = await this.connectWithRetry();
    if (!connected && process.env.NODE_ENV === 'production') {
      throw new Error(
        'Database connection failed in production. Check Railway DATABASE_URL (use Supabase Transaction pooler / Supavisor on aws-0-*.pooler.supabase.com:6543).',
      );
    }
    if (connected) {
      await ensureMembershipTariffDiscountSchema(this, this.logger);
      if (process.env.NODE_ENV === 'production') {
        await ensureConnectionEndedSchema(this, this.logger);
      }
    }
  }

  private logDatabaseTarget() {
    const raw = process.env.DATABASE_URL?.trim();
    if (!raw) {
      this.logger.error('DATABASE_URL is not set');
      return;
    }

    try {
      const normalized = raw.replace(/^postgres(ql)?:\/\//, 'http://');
      const parsed = new URL(normalized);
      const host = parsed.hostname;
      const port = parsed.port || '5432';
      this.logger.log(`DATABASE_URL target: ${host}:${port}`);

      if (/^db\.[a-z0-9]+\.supabase\.co$/i.test(host)) {
        this.logger.warn(
          'DATABASE_URL uses db.*.supabase.co. If connection fails on Railway, switch to Supabase Connect → Transaction pooler (aws-0-*.pooler.supabase.com:6543, user postgres.[project-ref]).',
        );
      } else if (/\.pooler\.supabase\.com$/i.test(host)) {
        this.logger.log('Using Supavisor pooler (IPv4-compatible).');
      }
    } catch {
      this.logger.warn('DATABASE_URL is set but could not be parsed for logging');
    }
  }

  private async connectWithRetry(): Promise<boolean> {
    const maxAttempts = 8;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connection established');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt === maxAttempts) {
          this.logger.error(`Failed to connect after ${maxAttempts} attempts: ${message}`);
          return false;
        }
        this.logger.warn(
          `Database connect attempt ${attempt}/${maxAttempts} failed (${message}); retrying…`,
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
      }
    }
    return false;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
