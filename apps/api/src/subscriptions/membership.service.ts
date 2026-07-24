import { Injectable, NotFoundException } from '@nestjs/common';
import { isPaidMember, SubscriptionPlan } from '@easymatch/shared';
import {
  MembershipPaymentStatus,
  SubscriptionPlan as PrismaSubscriptionPlan,
} from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipTariffsService } from './membership-tariffs.service';

type MembershipPlan = 'free' | 'gold' | 'platinum';

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

type ValidatedPaymentRow = {
  id: string;
  plan: PrismaSubscriptionPlan;
  durationDays: number;
  validatedAt: Date | null;
  subscriptionAppliedAt: Date | null;
};

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly tariffs: MembershipTariffsService,
  ) {}

  async setPlan(userId: string, plan: MembershipPlan) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { startsAt: true, endsAt: true, isActive: true, plan: true },
    });

    let startsAt = existing?.startsAt ?? now;
    let endsAt: Date | null = null;

    if (plan !== SubscriptionPlan.FREE) {
      const tariff = await this.tariffs.getByPlan(plan);
      startsAt = now;
      endsAt = addDays(now, tariff.durationDays);

      if (
        existing?.isActive &&
        existing.plan !== PrismaSubscriptionPlan.free &&
        existing.endsAt &&
        existing.endsAt.getTime() > now.getTime()
      ) {
        startsAt = existing.startsAt ?? now;
        endsAt = addDays(existing.endsAt, tariff.durationDays);
      }
    }

    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        isActive: true,
        startsAt,
        endsAt,
      },
      update: {
        plan,
        isActive: true,
        startsAt: plan === SubscriptionPlan.FREE ? undefined : startsAt,
        endsAt,
      },
      select: { plan: true, isActive: true, endsAt: true, startsAt: true },
    });

    this.authService.clearSessionCache(userId);

    return {
      subscription,
      isPaidMember: isPaidMember(subscription),
    };
  }

  /** @deprecated Use applyValidatedPayment — kept for admin/dev setPlan flows */
  async activateFromPayment(
    userId: string,
    plan: PrismaSubscriptionPlan,
    durationDays: number,
  ) {
    const payment = await this.prisma.membershipPayment.findFirst({
      where: {
        userId,
        plan,
        status: MembershipPaymentStatus.validated,
      },
      orderBy: { validatedAt: 'desc' },
    });

    if (payment) {
      return this.applyValidatedPayment(payment.id);
    }

    const now = new Date();
    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        isActive: true,
        startsAt: now,
        endsAt: addDays(now, durationDays),
      },
      update: {
        plan,
        isActive: true,
        startsAt: now,
        endsAt: addDays(now, durationDays),
      },
      select: { plan: true, isActive: true, endsAt: true, startsAt: true },
    });

    this.authService.clearSessionCache(userId);

    return {
      subscription,
      isPaidMember: isPaidMember(subscription),
    };
  }

  async applyValidatedPayment(paymentId: string) {
    const payment = await this.prisma.membershipPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.status !== MembershipPaymentStatus.validated) {
      throw new NotFoundException('Validated payment not found');
    }

    if (payment.subscriptionAppliedAt) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId: payment.userId },
        select: { plan: true, isActive: true, endsAt: true, startsAt: true },
      });
      return {
        subscription,
        isPaidMember: isPaidMember(subscription),
        alreadyApplied: true,
      };
    }

    const paymentAt = payment.validatedAt ?? new Date();
    const existing = await this.prisma.subscription.findUnique({
      where: { userId: payment.userId },
      select: { startsAt: true, endsAt: true, isActive: true, plan: true },
    });

    let startsAt = paymentAt;
    let endsAt = addDays(paymentAt, payment.durationDays);

    if (
      existing?.isActive &&
      existing.plan !== PrismaSubscriptionPlan.free &&
      existing.endsAt &&
      existing.endsAt.getTime() > paymentAt.getTime()
    ) {
      startsAt = existing.startsAt ?? paymentAt;
      endsAt = addDays(existing.endsAt, payment.durationDays);
    }

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { userId: payment.userId },
        create: {
          userId: payment.userId,
          plan: payment.plan,
          isActive: true,
          startsAt,
          endsAt,
        },
        update: {
          plan: payment.plan,
          isActive: true,
          startsAt,
          endsAt,
        },
        select: { plan: true, isActive: true, endsAt: true, startsAt: true },
      }),
      this.prisma.membershipPayment.update({
        where: { id: payment.id },
        data: { subscriptionAppliedAt: new Date() },
      }),
    ]);

    this.authService.clearSessionCache(payment.userId);

    return {
      subscription,
      isPaidMember: isPaidMember(subscription),
      alreadyApplied: false,
    };
  }

  computeSubscriptionFromPayments(
    payments: ValidatedPaymentRow[],
  ): {
    plan: PrismaSubscriptionPlan;
    startsAt: Date;
    endsAt: Date;
    currentPeriodStartsAt: Date;
    currentPeriodEndsAt: Date;
  } | null {
    const validated = payments
      .filter((row) => row.validatedAt)
      .sort(
        (a, b) => a.validatedAt!.getTime() - b.validatedAt!.getTime(),
      );

    if (validated.length === 0) {
      return null;
    }

    let startsAt: Date | null = null;
    let endsAt: Date | null = null;
    let plan = validated[0].plan;
    let currentPeriodStartsAt = validated[0].validatedAt!;
    let currentPeriodEndsAt = addDays(
      validated[0].validatedAt!,
      validated[0].durationDays,
    );

    for (const payment of validated) {
      const at = payment.validatedAt!;
      plan = payment.plan;

      if (!endsAt || endsAt.getTime() <= at.getTime()) {
        startsAt = at;
        endsAt = addDays(at, payment.durationDays);
      } else {
        endsAt = addDays(endsAt, payment.durationDays);
      }

      currentPeriodStartsAt = at;
      currentPeriodEndsAt = addDays(at, payment.durationDays);
    }

    if (!startsAt || !endsAt) {
      return null;
    }

    return {
      plan,
      startsAt,
      endsAt,
      currentPeriodStartsAt,
      currentPeriodEndsAt,
    };
  }

  async recalculateSubscriptionFromPayments(userId: string) {
    const payments = await this.prisma.membershipPayment.findMany({
      where: { userId, status: MembershipPaymentStatus.validated },
      select: {
        id: true,
        plan: true,
        durationDays: true,
        validatedAt: true,
        subscriptionAppliedAt: true,
      },
      orderBy: { validatedAt: 'asc' },
    });

    const computed = this.computeSubscriptionFromPayments(payments);
    if (!computed) {
      return;
    }

    const now = new Date();
    const isActive = computed.endsAt.getTime() > now.getTime();

    await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan: computed.plan,
          isActive,
          startsAt: computed.startsAt,
          endsAt: computed.endsAt,
        },
        update: {
          plan: computed.plan,
          isActive,
          startsAt: computed.startsAt,
          endsAt: computed.endsAt,
        },
      }),
      this.prisma.membershipPayment.updateMany({
        where: {
          userId,
          status: MembershipPaymentStatus.validated,
          subscriptionAppliedAt: null,
        },
        data: { subscriptionAppliedAt: now },
      }),
    ]);

    this.authService.clearSessionCache(userId);
  }

  resolveMissingEndsAt(
    subscription: {
      startsAt: Date;
      plan: PrismaSubscriptionPlan;
      endsAt: Date | null;
    },
    payments: { durationDays: number; validatedAt: Date | null }[],
    tariffDurationDays: number | null,
  ): Date | null {
    const computed = this.computeSubscriptionFromPayments(
      payments.map((payment, index) => ({
        id: String(index),
        plan: subscription.plan,
        durationDays: payment.durationDays,
        validatedAt: payment.validatedAt,
        subscriptionAppliedAt: null,
      })),
    );
    if (computed) {
      return computed.endsAt;
    }

    if (subscription.endsAt) {
      return subscription.endsAt;
    }
    if (subscription.plan === PrismaSubscriptionPlan.free) {
      return null;
    }

    if (tariffDurationDays && tariffDurationDays > 0) {
      return addDays(subscription.startsAt, tariffDurationDays);
    }

    return null;
  }

  async healMissingEndsAt(userId: string) {
    await this.recalculateSubscriptionFromPayments(userId);
  }
}
