import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    void this.connectWithRetry();
  }

  private async connectWithRetry() {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        if (attempt === maxAttempts) {
          console.error("[PrismaService] Failed to connect after retries:", err);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
