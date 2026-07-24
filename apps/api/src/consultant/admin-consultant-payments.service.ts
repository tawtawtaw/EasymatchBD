import { Injectable } from '@nestjs/common';
import {
  ConsultantPaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AdminConsultantPaymentFilter =
  | 'all'
  | 'pending'
  | 'validated'
  | 'failed'
  | 'cancelled';

type ListParams = {
  page?: number;
  limit?: number;
  q?: string;
  filter?: AdminConsultantPaymentFilter;
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
export class AdminConsultantPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const skip = (page - 1) * limit;
    const filter = params.filter ?? 'all';
    const q = params.q?.trim();
    const where = this.buildWhere(filter, q);

    const [items, total, stats] = await Promise.all([
      this.prisma.consultantPayment.findMany({
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
          engagement: {
            select: { id: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.consultantPayment.count({ where }),
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
    const row = await this.prisma.consultantPayment.findUnique({
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
        engagement: {
          select: { id: true, status: true, assignedConsultantId: true },
        },
      },
    });

    if (!row) return null;

    return {
      ...this.toListItem(row),
      userId: row.userId,
      connectionId: row.connectionId,
      serviceType: row.serviceType,
      serviceLabelEn: row.serviceLabelEn,
      memberNotes: row.memberNotes,
      sslResponse: row.sslResponse,
      gatewayUrl: row.gatewayUrl,
      sessionKey: row.sessionKey,
      engagement: row.engagement,
    };
  }

  private buildWhere(
    filter: AdminConsultantPaymentFilter,
    q?: string,
  ): Prisma.ConsultantPaymentWhereInput {
    const where: Prisma.ConsultantPaymentWhereInput = {};
    if (filter !== 'all') {
      where.status = filter as ConsultantPaymentStatus;
    }
    if (q) {
      where.OR = [
        { tranId: { contains: q, mode: 'insensitive' } },
        { valId: { contains: q, mode: 'insensitive' } },
        { serviceLabelEn: { contains: q, mode: 'insensitive' } },
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

    const [statusGroups, revenueToday, revenueWeek, revenueMonth, revenueAllTime] =
      await Promise.all([
        this.prisma.consultantPayment.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.revenueSince(dayStart),
        this.revenueSince(weekStart),
        this.revenueSince(monthStart),
        this.revenueSince(undefined),
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
    };
  }

  private async revenueSince(since?: Date) {
    const result = await this.prisma.consultantPayment.aggregate({
      where: {
        status: ConsultantPaymentStatus.validated,
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

  private toListItem(row: {
    id: string;
    tranId: string;
    valId: string | null;
    serviceType: string;
    serviceLabelEn: string;
    amountBdt: Prisma.Decimal;
    currency: string;
    status: ConsultantPaymentStatus;
    sslStatus: string | null;
    validatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      phone: string | null;
      email: string | null;
      profile: { fullName: string | null; profileCode: string | null } | null;
    };
    engagement?: { id: string; status: string } | null;
  }) {
    return {
      id: row.id,
      tranId: row.tranId,
      valId: row.valId,
      serviceType: row.serviceType,
      serviceLabelEn: row.serviceLabelEn,
      amountBdt: row.amountBdt.toFixed(2),
      currency: row.currency,
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
      engagement: row.engagement ?? null,
    };
  }
}
