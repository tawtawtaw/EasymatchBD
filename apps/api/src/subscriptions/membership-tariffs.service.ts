import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionPlan } from '@prisma/client';
import {
  PAID_MEMBERSHIP_TARIFF_PLANS,
  SubscriptionPlan as SharedSubscriptionPlan,
  tariffCalendarDate,
} from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TARIFFS: {
  plan: SubscriptionPlan;
  labelEn: string;
  labelBn: string;
  priceBdt: Prisma.Decimal;
  durationDays: number;
  sortOrder: number;
  descriptionEn: string;
  descriptionBn: string;
}[] = [
  {
    plan: SubscriptionPlan.gold,
    labelEn: 'Gold membership',
    labelBn: 'গোল্ড সদস্যপদ',
    priceBdt: new Prisma.Decimal(999),
    durationDays: 30,
    sortOrder: 1,
    descriptionEn:
      'Unlock interest, messaging, video calls, and biodata PDF for 30 days.',
    descriptionBn: '৩০ দিনের জন্য ইন্টারেস্ট, মেসেজ, ভিডিও কল ও biodata PDF।',
  },
  {
    plan: SubscriptionPlan.platinum,
    labelEn: 'Platinum membership',
    labelBn: 'প্লাটিনাম সদস্যপদ',
    priceBdt: new Prisma.Decimal(1999),
    durationDays: 30,
    sortOrder: 2,
    descriptionEn:
      'Full paid access for 30 days (same features as Gold; pricing tier for future perks).',
    descriptionBn:
      '৩০ দিনের পূর্ণ paid access (Gold-এর মতো; ভবিষ্যতে আলাদা সুবিধার জন্য tier)।',
  },
];

export type MembershipTariffUpdate = {
  plan: string;
  labelEn: string;
  labelBn?: string | null;
  priceBdt: number;
  currency?: string;
  durationDays: number;
  isActive: boolean;
  sortOrder: number;
  descriptionEn?: string | null;
  descriptionBn?: string | null;
  discountPriceBdt?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  discountLabelEn?: string | null;
  discountLabelBn?: string | null;
};

type MembershipTariffDto = {
  id: string;
  plan: SubscriptionPlan;
  labelEn: string;
  labelBn: string | null;
  priceBdt: string;
  currency: string;
  durationDays: number;
  isActive: boolean;
  sortOrder: number;
  descriptionEn: string | null;
  descriptionBn: string | null;
  discountPriceBdt: string | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  discountLabelEn: string | null;
  discountLabelBn: string | null;
  updatedAt: string;
};

@Injectable()
export class MembershipTariffsService {
  private syncChecked = false;
  private activeTariffsCache: {
    expiresAt: number;
    value: MembershipTariffDto[];
  } | null = null;
  private static readonly ACTIVE_TARIFFS_CACHE_TTL_MS = 300_000;

  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    await this.ensureTariffsSynced();
    const rows = await this.prisma.membershipTariff.findMany({
      orderBy: [{ sortOrder: 'asc' }, { plan: 'asc' }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async listActive() {
    if (
      this.activeTariffsCache &&
      this.activeTariffsCache.expiresAt > Date.now()
    ) {
      return this.activeTariffsCache.value;
    }

    try {
      await this.ensureTariffsSynced();
      const rows = await this.prisma.membershipTariff.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { plan: 'asc' }],
      });
      const value = rows.map((row) => this.toDto(row));
      this.setActiveTariffsCache(value);
      return value;
    } catch {
      if (this.activeTariffsCache) {
        return this.activeTariffsCache.value;
      }
      return this.defaultActiveTariffs();
    }
  }

  async getByPlan(plan: string) {
    await this.ensureTariffsSynced();
    const normalized = this.assertPaidPlan(plan);
    const row = await this.prisma.membershipTariff.findUnique({
      where: { plan: normalized },
    });
    if (!row) {
      throw new NotFoundException(`Tariff not found for plan: ${plan}`);
    }
    return this.toDto(row);
  }

  async bulkUpdate(updates: MembershipTariffUpdate[]) {
    await this.ensureTariffsSynced();

    for (const update of updates) {
      const plan = this.assertPaidPlan(update.plan);
      if (update.priceBdt < 0) {
        throw new BadRequestException(`Price must be zero or positive for ${plan}`);
      }
      if (update.durationDays < 1) {
        throw new BadRequestException(
          `Duration must be at least 1 day for ${plan}`,
        );
      }

      const discount = this.normalizeDiscount(plan, update);

      const existing = await this.prisma.membershipTariff.findUnique({
        where: { plan },
      });
      if (!existing) {
        throw new NotFoundException(`Tariff not found for plan: ${plan}`);
      }

      await this.prisma.membershipTariff.update({
        where: { plan },
        data: {
          labelEn: update.labelEn.trim(),
          labelBn: update.labelBn?.trim() || null,
          priceBdt: new Prisma.Decimal(update.priceBdt),
          currency: update.currency?.trim() || 'BDT',
          durationDays: update.durationDays,
          isActive: update.isActive,
          sortOrder: update.sortOrder,
          descriptionEn: update.descriptionEn?.trim() || null,
          descriptionBn: update.descriptionBn?.trim() || null,
          discountPriceBdt: discount.price,
          discountStartsAt: discount.startsAt,
          discountEndsAt: discount.endsAt,
          discountLabelEn: discount.labelEn,
          discountLabelBn: discount.labelBn,
        },
      });
    }

    this.clearActiveTariffsCache();
    return this.listAll();
  }

  clearActiveTariffsCache() {
    this.activeTariffsCache = null;
  }

  private assertPaidPlan(plan: string): SubscriptionPlan {
    if (
      plan !== SharedSubscriptionPlan.GOLD &&
      plan !== SharedSubscriptionPlan.PLATINUM
    ) {
      throw new BadRequestException(
        `Only paid plans can have tariffs: ${PAID_MEMBERSHIP_TARIFF_PLANS.join(', ')}`,
      );
    }
    return plan as SubscriptionPlan;
  }

  private async ensureTariffsSynced() {
    if (this.syncChecked) {
      return;
    }

    try {
      const existingCount = await this.prisma.membershipTariff.count();
      if (existingCount >= DEFAULT_TARIFFS.length) {
        this.syncChecked = true;
        return;
      }

      await Promise.all(
        DEFAULT_TARIFFS.map((tariff) =>
          this.prisma.membershipTariff.upsert({
            where: { plan: tariff.plan },
            create: tariff,
            update: {},
          }),
        ),
      );

      this.syncChecked = true;
    } catch {
      // Leave syncChecked false so a later request can retry when DB is back.
    }
  }

  private setActiveTariffsCache(value: MembershipTariffDto[]) {
    this.activeTariffsCache = {
      expiresAt:
        Date.now() + MembershipTariffsService.ACTIVE_TARIFFS_CACHE_TTL_MS,
      value,
    };
  }

  private defaultActiveTariffs(): MembershipTariffDto[] {
    const updatedAt = new Date(0).toISOString();
    return DEFAULT_TARIFFS.map((tariff) => ({
      id: `default-${tariff.plan}`,
      plan: tariff.plan,
      labelEn: tariff.labelEn,
      labelBn: tariff.labelBn,
      priceBdt: tariff.priceBdt.toFixed(2),
      currency: 'BDT',
      durationDays: tariff.durationDays,
      isActive: true,
      sortOrder: tariff.sortOrder,
      descriptionEn: tariff.descriptionEn,
      descriptionBn: tariff.descriptionBn,
      discountPriceBdt: null,
      discountStartsAt: null,
      discountEndsAt: null,
      discountLabelEn: null,
      discountLabelBn: null,
      updatedAt,
    }));
  }

  private normalizeDiscount(
    plan: SubscriptionPlan,
    update: MembershipTariffUpdate,
  ): {
    price: Prisma.Decimal | null;
    startsAt: Date | null;
    endsAt: Date | null;
    labelEn: string | null;
    labelBn: string | null;
  } {
    const empty = {
      price: null,
      startsAt: null,
      endsAt: null,
      labelEn: null,
      labelBn: null,
    };
    if (update.discountPriceBdt == null) {
      return empty;
    }

    if (update.discountPriceBdt >= update.priceBdt) {
      throw new BadRequestException(
        `Discount price must be lower than the regular price for ${plan}`,
      );
    }

    const endsOn = tariffCalendarDate(update.discountEndsAt);
    if (!endsOn) {
      throw new BadRequestException(
        `Discount end date is required when a sale price is set for ${plan}`,
      );
    }
    const startsOn = tariffCalendarDate(update.discountStartsAt);
    if (startsOn && startsOn > endsOn) {
      throw new BadRequestException(
        `Discount start date must be on or before the end date for ${plan}`,
      );
    }

    return {
      price: new Prisma.Decimal(update.discountPriceBdt),
      startsAt: startsOn ? new Date(`${startsOn}T00:00:00.000Z`) : null,
      endsAt: new Date(`${endsOn}T00:00:00.000Z`),
      labelEn: update.discountLabelEn?.trim() || null,
      labelBn: update.discountLabelBn?.trim() || null,
    };
  }

  private toDto(row: {
    id: string;
    plan: SubscriptionPlan;
    labelEn: string;
    labelBn: string | null;
    priceBdt: Prisma.Decimal;
    currency: string;
    durationDays: number;
    isActive: boolean;
    sortOrder: number;
    descriptionEn: string | null;
    descriptionBn: string | null;
    discountPriceBdt: Prisma.Decimal | null;
    discountStartsAt: Date | null;
    discountEndsAt: Date | null;
    discountLabelEn: string | null;
    discountLabelBn: string | null;
    updatedAt: Date;
  }): MembershipTariffDto {
    return {
      id: row.id,
      plan: row.plan,
      labelEn: row.labelEn,
      labelBn: row.labelBn,
      priceBdt: row.priceBdt.toFixed(2),
      currency: row.currency,
      durationDays: row.durationDays,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      descriptionEn: row.descriptionEn,
      descriptionBn: row.descriptionBn,
      discountPriceBdt: row.discountPriceBdt?.toFixed(2) ?? null,
      discountStartsAt: row.discountStartsAt
        ? row.discountStartsAt.toISOString()
        : null,
      discountEndsAt: row.discountEndsAt ? row.discountEndsAt.toISOString() : null,
      discountLabelEn: row.discountLabelEn,
      discountLabelBn: row.discountLabelBn,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
