import { Injectable, NotFoundException } from '@nestjs/common';
import { isPaidMember, getMembershipServicePackage } from '@easymatch/shared';
import { MembershipPaymentStatus, SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipService } from './membership.service';
import { MembershipTariffsService } from './membership-tariffs.service';

@Injectable()
export class MembershipAccountService {
  private readonly accountCache = new Map<
    string,
    { expiresAt: number; value: Awaited<ReturnType<MembershipAccountService['buildAccount']>> }
  >();
  private static readonly ACCOUNT_CACHE_TTL_MS = 60_000;
  private static readonly ACCOUNT_STALE_TTL_MS = 180_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly tariffs: MembershipTariffsService,
  ) {}

  async getAccount(userId: string) {
    const cached = this.accountCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (
      cached &&
      cached.expiresAt + MembershipAccountService.ACCOUNT_STALE_TTL_MS >
        Date.now()
    ) {
      void this.refreshAccount(userId);
      return cached.value;
    }

    return this.loadAccount(userId);
  }

  private refreshAccount(userId: string) {
    void this.loadAccount(userId);
  }

  private async loadAccount(userId: string) {
    const value = await this.buildAccount(userId);
    this.accountCache.set(userId, {
      expiresAt: Date.now() + MembershipAccountService.ACCOUNT_CACHE_TTL_MS,
      value,
    });
    return value;
  }

  clearAccountCache(userId?: string) {
    if (userId) {
      this.accountCache.delete(userId);
      return;
    }
    this.accountCache.clear();
  }

  private async buildAccount(userId: string) {
    await this.membership.healMissingEndsAt(userId);

    const [subscription, payments, user] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { userId },
        select: {
          plan: true,
          startsAt: true,
          endsAt: true,
          isActive: true,
        },
      }),
      this.prisma.membershipPayment.findMany({
        where: {
          userId,
          status: MembershipPaymentStatus.validated,
        },
        orderBy: { validatedAt: 'desc' },
        select: {
          id: true,
          tranId: true,
          valId: true,
          plan: true,
          serviceCode: true,
          amountBdt: true,
          currency: true,
          durationDays: true,
          status: true,
          validatedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          phone: true,
          email: true,
          profile: {
            select: { fullName: true, profileCode: true },
          },
        },
      }),
    ]);

    const validatedPayments = payments.map((payment) => ({
      id: payment.id,
      plan: payment.plan,
      durationDays: payment.durationDays,
      validatedAt: payment.validatedAt ? new Date(payment.validatedAt) : null,
      subscriptionAppliedAt: null,
    }));

    const computed =
      this.membership.computeSubscriptionFromPayments(validatedPayments);

    const subscriptionSnapshot = subscription
      ? {
          plan: subscription.plan,
          startsAt: subscription.startsAt.toISOString(),
          endsAt: subscription.endsAt?.toISOString() ?? null,
          isActive: subscription.isActive,
          isPaidMember: isPaidMember({
            plan: subscription.plan,
            isActive: subscription.isActive,
            endsAt: subscription.endsAt,
          }),
          currentPeriodStartsAt:
            computed?.currentPeriodStartsAt.toISOString() ?? null,
          currentPeriodEndsAt:
            computed?.currentPeriodEndsAt.toISOString() ?? null,
        }
      : null;

    return {
      subscription: subscriptionSnapshot,
      member: {
        fullName: user?.profile?.fullName ?? null,
        profileCode: user?.profile?.profileCode ?? null,
        phone: user?.phone ?? null,
        email: user?.email ?? null,
      },
      payments: payments.map((payment) => ({
        id: payment.id,
        tranId: payment.tranId,
        valId: payment.valId,
        plan: payment.plan,
        serviceCode: payment.serviceCode,
        amountBdt: payment.amountBdt.toFixed(2),
        currency: payment.currency,
        durationDays: payment.durationDays,
        status: payment.status,
        validatedAt: payment.validatedAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
      })),
    };
  }

  async getPaymentReceipt(userId: string, paymentId: string) {
    const [payment, subscription] = await Promise.all([
      this.prisma.membershipPayment.findFirst({
        where: {
          id: paymentId,
          userId,
          status: MembershipPaymentStatus.validated,
        },
        select: {
          id: true,
          tranId: true,
          valId: true,
          plan: true,
          serviceCode: true,
          amountBdt: true,
          currency: true,
          durationDays: true,
          status: true,
          validatedAt: true,
          createdAt: true,
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
      }),
      this.prisma.subscription.findUnique({
        where: { userId },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    if (!payment) {
      throw new NotFoundException('Payment receipt not found');
    }

    return {
      id: payment.id,
      tranId: payment.tranId,
      valId: payment.valId,
      plan: payment.plan,
      serviceCode: payment.serviceCode,
      amountBdt: payment.amountBdt.toFixed(2),
      currency: payment.currency,
      durationDays: payment.durationDays,
      status: payment.status,
      validatedAt: payment.validatedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      member: {
        fullName: payment.user.profile?.fullName ?? null,
        profileCode: payment.user.profile?.profileCode ?? null,
        phone: payment.user.phone,
        email: payment.user.email,
      },
      receiptKind: 'payment' as const,
      subscriptionStartsAt: subscription?.startsAt.toISOString() ?? null,
      subscriptionEndsAt: subscription?.endsAt?.toISOString() ?? null,
    };
  }

  async getSubscriptionReceipt(userId: string) {
    await this.membership.healMissingEndsAt(userId);

    const latestPayment = await this.prisma.membershipPayment.findFirst({
      where: {
        userId,
        status: MembershipPaymentStatus.validated,
      },
      orderBy: { validatedAt: 'desc' },
      select: { id: true },
    });

    if (latestPayment) {
      return this.getPaymentReceipt(userId, latestPayment.id);
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
      },
    });

    if (
      !subscription ||
      subscription.plan === SubscriptionPlan.free ||
      !subscription.isActive
    ) {
      throw new NotFoundException('No membership receipt available');
    }

    const [user, tariff] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          phone: true,
          email: true,
          profile: {
            select: { fullName: true, profileCode: true },
          },
        },
      }),
      this.tariffs.getByPlan(subscription.plan),
    ]);

    const reference = subscription.startsAt.getTime().toString(36).toUpperCase();

    return {
      id: `subscription-${userId}`,
      tranId: `EM-${reference}`,
      valId: null,
      plan: subscription.plan,
      serviceCode: getMembershipServicePackage(subscription.plan)?.code ?? null,
      amountBdt: tariff.priceBdt,
      currency: tariff.currency,
      durationDays: tariff.durationDays,
      status: MembershipPaymentStatus.validated,
      validatedAt: subscription.startsAt.toISOString(),
      createdAt: subscription.startsAt.toISOString(),
      member: {
        fullName: user?.profile?.fullName ?? null,
        profileCode: user?.profile?.profileCode ?? null,
        phone: user?.phone ?? null,
        email: user?.email ?? null,
      },
      receiptKind: 'subscription' as const,
      subscriptionStartsAt: subscription.startsAt.toISOString(),
      subscriptionEndsAt: subscription.endsAt?.toISOString() ?? null,
    };
  }
}
