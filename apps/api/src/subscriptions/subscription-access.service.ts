import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  isPaidMember,
  PAID_MEMBERSHIP_REQUIRED_MESSAGE,
} from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';

const PAID_MEMBER_CACHE_TTL_MS = 60_000;

@Injectable()
export class SubscriptionAccessService {
  private readonly paidMemberCache = new Map<
    string,
    { expiresAt: number; value: boolean }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async getMembership(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, isActive: true, endsAt: true },
    });
  }

  async isPaidMember(userId: string) {
    const cached = this.paidMemberCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const subscription = await this.getMembership(userId);
    const value = isPaidMember(subscription);
    this.setPaidMemberCache(userId, value);
    return value;
  }

  primePaidMember(userId: string, value: boolean) {
    this.setPaidMemberCache(userId, value);
  }

  private setPaidMemberCache(userId: string, value: boolean) {
    this.paidMemberCache.set(userId, {
      expiresAt: Date.now() + PAID_MEMBER_CACHE_TTL_MS,
      value,
    });
  }

  async assertPaidMember(userId: string) {
    if (!(await this.isPaidMember(userId))) {
      throw new ForbiddenException(PAID_MEMBERSHIP_REQUIRED_MESSAGE);
    }
  }
}
