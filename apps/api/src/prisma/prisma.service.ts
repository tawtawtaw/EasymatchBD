import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logDatabaseTarget();
    void this.connectWithRetry();
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
          'DATABASE_URL uses db.*.supabase.co — Railway (IPv4) often cannot reach this. Use Supabase Connect → Transaction pooler (aws-0-*.pooler.supabase.com:6543) on Railway.',
        );
      }
    } catch {
      this.logger.warn('DATABASE_URL is set but could not be parsed for logging');
    }
  }

  private async connectWithRetry() {
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connection established');
        return;
      } catch (err) {
        if (attempt === maxAttempts) {
          this.logger.error('Failed to connect after retries', err);
          return;
        }
        this.logger.warn(
          `Database connect attempt ${attempt}/${maxAttempts} failed; retrying…`,
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
