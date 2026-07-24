import { Injectable } from '@nestjs/common';
import {
  isPaidMember,
  SubscriptionPlan as SharedSubscriptionPlan,
} from '@easymatch/shared';
import {
  MembershipPaymentStatus,
  Prisma,
  SubscriptionPlan,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AdminPaymentFilter =
  | 'all'
  | 'pending'
  | 'validated'
  | 'failed'
  | 'cancelled';

type ListParams = {
  page?: number;
  limit?: number;
  q?: string;
  filter?: AdminPaymentFilter;
};

function decimalString(value: Prisma.Decimal | null | undefined): string {
  if (value == null) return '0.00';
  return value.toFixed(2);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

@Injectable()
export class AdminMembershipPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const skip = (page - 1) * limit;
    const filter = params.filter ?? 'all';
    const q = params.q?.trim();

    const where = this.buildWhere(filter, q);

    const [items, total, stats] = await Promise.all([
      this.prisma.membershipPayment.findMany({
        where,
        include: {
          user: {
            select: {
              phone: true,
              email: true,
              profile: {
                select: { fullName: true, profileCode: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.membershipPayment.count({ where }),
      this.buildStats(),
    ]);

    return {
      items: items.map((row) => this.toListItem(row)),
      total,
      page,
      limit,
      stats,
    };
  }

  async getById(id: string) {
    const row = await this.prisma.membershipPayment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            email: true,
            profile: {
              select: { fullName: true, profileCode: true },
            },
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      ...this.toListItem(row),
      userId: row.userId,
      sslResponse: row.sslResponse,
      gatewayUrl: row.gatewayUrl,
      sessionKey: row.sessionKey,
    };
  }

  private buildWhere(
    filter: AdminPaymentFilter,
    q?: string,
  ): Prisma.MembershipPaymentWhereInput {
    const where: Prisma.MembershipPaymentWhereInput = {};

    if (filter !== 'all') {
      where.status = filter as MembershipPaymentStatus;
    }

    if (q) {
      where.OR = [
        { tranId: { contains: q, mode: 'insensitive' } },
        { valId: { contains: q, mode: 'insensitive' } },
        { user: { phone: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        {
          user: {
            profile: {
              OR: [
                { profileCode: { contains: q, mode: 'insensitive' } },
                { fullName: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    return where;
  }

  private async buildStats() {
    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const trendStart = new Date(dayStart);
    trendStart.setDate(trendStart.getDate() - 29);

    const [
      statusGroups,
      revenueToday,
      revenueWeek,
      revenueMonth,
      revenueAllTime,
      planGroups,
      activeSubscriptions,
      lastValidated,
      trendPayments,
    ] = await Promise.all([
      this.prisma.membershipPayment.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amountBdt: true },
      }),
      this.revenueSince(dayStart),
      this.revenueSince(weekStart),
      this.revenueSince(monthStart),
      this.revenueSince(undefined),
      this.prisma.membershipPayment.groupBy({
        by: ['plan'],
        where: { status: MembershipPaymentStatus.validated },
        _count: { id: true },
        _sum: { amountBdt: true },
      }),
      this.prisma.subscription.findMany({
        where: {
          plan: { not: SubscriptionPlan.free },
          isActive: true,
        },
        select: { plan: true, isActive: true, endsAt: true },
      }),
      this.prisma.membershipPayment.findFirst({
        where: { status: MembershipPaymentStatus.validated },
        orderBy: { validatedAt: 'desc' },
        select: { validatedAt: true },
      }),
      this.prisma.membershipPayment.findMany({
        where: {
          status: MembershipPaymentStatus.validated,
          validatedAt: { gte: trendStart },
        },
        select: { validatedAt: true, amountBdt: true },
        orderBy: { validatedAt: 'asc' },
      }),
    ]);

    const byStatus = {
      pending: 0,
      validated: 0,
      failed: 0,
      cancelled: 0,
    };

    let totalInitiated = 0;
    for (const group of statusGroups) {
      byStatus[group.status] = group._count.id;
      totalInitiated += group._count.id;
    }

    const completed =
      byStatus.validated + byStatus.failed + byStatus.cancelled;
    const successRatePercent =
      completed > 0
        ? Math.round((byStatus.validated / completed) * 1000) / 10
        : 0;

    const planStats = {
      gold: { count: 0, revenueBdt: '0.00' },
      platinum: { count: 0, revenueBdt: '0.00' },
    };

    for (const group of planGroups) {
      if (group.plan === SubscriptionPlan.gold) {
        planStats.gold = {
          count: group._count.id,
          revenueBdt: decimalString(group._sum.amountBdt),
        };
      } else if (group.plan === SubscriptionPlan.platinum) {
        planStats.platinum = {
          count: group._count.id,
          revenueBdt: decimalString(group._sum.amountBdt),
        };
      }
    }

    const activePaidMembers = activeSubscriptions.filter((sub) =>
      isPaidMember(sub),
    ).length;

    const activeGold = activeSubscriptions.filter(
      (sub) =>
        sub.plan === SharedSubscriptionPlan.GOLD && isPaidMember(sub),
    ).length;

    const activePlatinum = activeSubscriptions.filter(
      (sub) =>
        sub.plan === SharedSubscriptionPlan.PLATINUM && isPaidMember(sub),
    ).length;

    return {
      totalInitiated,
      byStatus,
      successRatePercent,
      revenue: {
        todayBdt: revenueToday.revenueBdt,
        weekBdt: revenueWeek.revenueBdt,
        monthBdt: revenueMonth.revenueBdt,
        allTimeBdt: revenueAllTime.revenueBdt,
        todayCount: revenueToday.count,
        weekCount: revenueWeek.count,
        monthCount: revenueMonth.count,
        allTimeCount: revenueAllTime.count,
      },
      byPlan: planStats,
      activeMembers: {
        total: activePaidMembers,
        gold: activeGold,
        platinum: activePlatinum,
      },
      lastValidatedAt: lastValidated?.validatedAt?.toISOString() ?? null,
      dailyTrend: this.buildDailyTrend(trendStart, trendPayments),
    };
  }

  private async revenueSince(since?: Date) {
    const result = await this.prisma.membershipPayment.aggregate({
      where: {
        status: MembershipPaymentStatus.validated,
        ...(since ? { validatedAt: { gte: since } } : {}),
      },
      _sum: { amountBdt: true },
      _count: { id: true },
    });

    return {
      revenueBdt: decimalString(result._sum.amountBdt),
      count: result._count.id,
    };
  }

  private buildDailyTrend(
    start: Date,
    payments: { validatedAt: Date | null; amountBdt: Prisma.Decimal }[],
  ) {
    const buckets = new Map<string, { count: number; revenue: number }>();

    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), { count: 0, revenue: 0 });
    }

    for (const payment of payments) {
      if (!payment.validatedAt) continue;
      const key = payment.validatedAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.count += 1;
      bucket.revenue += Number(payment.amountBdt.toFixed(2));
    }

    return Array.from(buckets.entries()).map(([date, value]) => ({
      date,
      count: value.count,
      revenueBdt: value.revenue.toFixed(2),
    }));
  }

  private toListItem(row: {
    id: string;
    tranId: string;
    valId: string | null;
    plan: SubscriptionPlan;
    amountBdt: Prisma.Decimal;
    currency: string;
    durationDays: number;
    status: MembershipPaymentStatus;
    sslStatus: string | null;
    validatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      phone: string | null;
      email: string | null;
      profile: { fullName: string | null; profileCode: string | null } | null;
    };
  }) {
    return {
      id: row.id,
      tranId: row.tranId,
      valId: row.valId,
      plan: row.plan,
      amountBdt: row.amountBdt.toFixed(2),
      currency: row.currency,
      durationDays: row.durationDays,
      status: row.status,
      sslStatus: row.sslStatus,
      validatedAt: row.validatedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      member: {
        fullName: row.user.profile?.fullName ?? null,
        profileCode: row.user.profile?.profileCode ?? null,
        phone: row.user.phone,
        email: row.user.email,
      },
    };
  }
}
