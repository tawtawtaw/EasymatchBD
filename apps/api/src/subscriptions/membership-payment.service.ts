import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isPaidMember,
  PROFILE_REQUIRED_FOR_SUBSCRIPTION_MESSAGE,
  VERIFIED_MEMBER_REQUIRED_FOR_SUBSCRIPTION_MESSAGE,
  getMembershipServicePackage,
  membershipEffectivePriceBdt,
} from '@easymatch/shared';
import {
  MembershipPaymentStatus,
  Prisma,
  SubscriptionPlan,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipService } from './membership.service';
import { MembershipTariffsService } from './membership-tariffs.service';
import type {
  SslCommerzInitResponse,
  SslCommerzValidationResponse,
} from './sslcommerz.types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SSLCommerzPayment = require('sslcommerz-lts') as new (
  storeId: string,
  storePassword: string,
  live?: boolean,
) => {
  init(data: Record<string, unknown>): Promise<SslCommerzInitResponse>;
  validate(data: { val_id: string }): Promise<SslCommerzValidationResponse>;
};

type CallbackPayload = Record<string, string | undefined>;

@Injectable()
export class MembershipPaymentService {
  private readonly gateway: InstanceType<typeof SSLCommerzPayment> | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly membership: MembershipService,
    private readonly tariffs: MembershipTariffsService,
  ) {
    const storeId = this.config.get<string>('SSLCOMMERZ_STORE_ID');
    const storePassword = this.config.get<string>('SSLCOMMERZ_STORE_PASSWORD');
    const isLive = this.config.get<string>('SSLCOMMERZ_IS_LIVE') === 'true';

    this.gateway =
      storeId && storePassword
        ? new SSLCommerzPayment(storeId, storePassword, isLive)
        : null;
  }

  isConfigured(): boolean {
    return this.gateway != null;
  }

  private webPublicUrl(): string {
    return (
      this.config.get<string>('WEB_PUBLIC_URL') ??
      this.config.get<string>('CORS_ORIGIN') ??
      'http://localhost:4100'
    ).replace(/\/$/, '');
  }

  private callbackBaseUrl(): string {
    return `${this.webPublicUrl()}/api/v1/membership/payments/sslcommerz`;
  }

  async createCheckout(userId: string, plan: string) {
    if (!this.gateway) {
      throw new ServiceUnavailableException(
        'SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD.',
      );
    }

    const tariff = await this.tariffs.getByPlan(plan);
    if (!tariff.isActive) {
      throw new BadRequestException('This membership plan is not available.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        profile: {
          select: {
            fullName: true,
            currentDistrict: true,
            currentCityTown: true,
            currentDivision: true,
            isVerified: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profile) {
      throw new ForbiddenException(PROFILE_REQUIRED_FOR_SUBSCRIPTION_MESSAGE);
    }

    if (!user.profile.isVerified) {
      throw new ForbiddenException(
        VERIFIED_MEMBER_REQUIRED_FOR_SUBSCRIPTION_MESSAGE,
      );
    }

    const amount = new Prisma.Decimal(membershipEffectivePriceBdt(tariff));
    const tranId = `EM-${randomBytes(6).toString('hex')}-${Date.now()}`;
    const callbackBase = this.callbackBaseUrl();
    const servicePackage = getMembershipServicePackage(plan);

    await this.prisma.membershipPayment.create({
      data: {
        userId,
        plan: plan as SubscriptionPlan,
        serviceCode: servicePackage?.code ?? null,
        tranId,
        amountBdt: amount,
        currency: tariff.currency,
        durationDays: tariff.durationDays,
      },
    });

    const customerName =
      user.profile?.fullName?.trim() || 'EasymatchBD Member';
    const customerPhone = user.phone?.replace(/\D/g, '').slice(-11) || '01700000000';
    const customerEmail =
      user.email?.trim() || `${userId}@members.easymatchbd.local`;
    const customerCity =
      user.profile?.currentCityTown?.trim() ||
      user.profile?.currentDistrict?.trim() ||
      'Dhaka';
    const customerState =
      user.profile?.currentDivision?.trim() || 'Dhaka';

    const initResponse = await this.gateway.init({
      total_amount: amount.toFixed(2),
      currency: tariff.currency,
      tran_id: tranId,
      success_url: `${callbackBase}/success`,
      fail_url: `${callbackBase}/fail`,
      cancel_url: `${callbackBase}/cancel`,
      ipn_url: `${callbackBase}/ipn`,
      shipping_method: 'NO',
      product_name: servicePackage
        ? `${servicePackage.code} — ${tariff.labelEn}`
        : tariff.labelEn,
      product_category: 'Membership',
      product_profile: 'non-physical-goods',
      cus_name: customerName,
      cus_email: customerEmail,
      cus_add1: 'EasymatchBD',
      cus_add2: customerCity,
      cus_city: customerCity,
      cus_state: customerState,
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: customerPhone,
      emi_option: 0,
      num_of_item: 1,
      value_a: userId,
      value_b: plan,
    });

    if (initResponse.status !== 'SUCCESS' || !initResponse.GatewayPageURL) {
      await this.prisma.membershipPayment.update({
        where: { tranId },
        data: {
          status: MembershipPaymentStatus.failed,
          sslResponse: initResponse as Prisma.InputJsonValue,
          sslStatus: initResponse.status ?? 'INIT_FAILED',
        },
      });
      throw new BadRequestException(
        initResponse.failedreason || 'Could not start SSLCommerz checkout.',
      );
    }

    await this.prisma.membershipPayment.update({
      where: { tranId },
      data: {
        gatewayUrl: initResponse.GatewayPageURL,
        sessionKey:
          typeof initResponse.sessionkey === 'string'
            ? initResponse.sessionkey
            : null,
        sslResponse: initResponse as Prisma.InputJsonValue,
        sslStatus: initResponse.status,
      },
    });

    return {
      gatewayUrl: initResponse.GatewayPageURL,
      tranId,
    };
  }

  async handleIpn(payload: CallbackPayload) {
    const result = await this.processPayment(payload, 'ipn');
    return result.ok;
  }

  async handleBrowserReturn(
    payload: CallbackPayload,
    outcome: 'success' | 'fail' | 'cancel',
  ) {
    return this.processPayment(payload, outcome);
  }

  private async processPayment(
    payload: CallbackPayload,
    outcome: 'success' | 'fail' | 'cancel' | 'ipn',
  ) {
    const tranId = payload.tran_id?.trim();
    if (!tranId) {
      return { ok: false as const, payment: null };
    }

    const payment = await this.prisma.membershipPayment.findUnique({
      where: { tranId },
    });

    if (!payment) {
      return { ok: false as const, payment: null };
    }

    if (outcome === 'fail' || outcome === 'cancel') {
      if (payment.status === MembershipPaymentStatus.pending) {
        await this.prisma.membershipPayment.update({
          where: { id: payment.id },
          data: {
            status:
              outcome === 'cancel'
                ? MembershipPaymentStatus.cancelled
                : MembershipPaymentStatus.failed,
            sslStatus: payload.status ?? outcome,
          },
        });
      }
      return { ok: true as const, payment };
    }

    if (payment.status === MembershipPaymentStatus.validated) {
      if (!payment.subscriptionAppliedAt) {
        await this.membership.applyValidatedPayment(payment.id);
      }
      return { ok: true as const, payment, alreadyValidated: true };
    }

    const valId = payload.val_id?.trim();
    if (!valId || !this.gateway) {
      return { ok: false as const, payment };
    }

    const validation = await this.gateway.validate({ val_id: valId });
    const validStatus =
      validation.status === 'VALID' || validation.status === 'VALIDATED';

    if (!validStatus) {
      await this.prisma.membershipPayment.update({
        where: { id: payment.id },
        data: {
          status: MembershipPaymentStatus.failed,
          sslStatus: validation.status ?? 'INVALID',
          sslResponse: validation as Prisma.InputJsonValue,
        },
      });
      return { ok: false as const, payment };
    }

    if (validation.tran_id && validation.tran_id !== tranId) {
      return { ok: false as const, payment };
    }

    const paidAmount = Number.parseFloat(validation.amount ?? '');
    const expectedAmount = Number(payment.amountBdt.toFixed(2));
    if (
      !Number.isFinite(paidAmount) ||
      Math.abs(paidAmount - expectedAmount) > 0.01
    ) {
      return { ok: false as const, payment };
    }

    if (validation.currency && validation.currency !== payment.currency) {
      return { ok: false as const, payment };
    }

    await this.prisma.membershipPayment.update({
      where: { id: payment.id },
      data: {
        status: MembershipPaymentStatus.validated,
        valId,
        validatedAt: new Date(),
        sslStatus: validation.status,
        sslResponse: validation as Prisma.InputJsonValue,
      },
    });

    await this.membership.applyValidatedPayment(payment.id);

    return { ok: true as const, payment };
  }

  webRedirectPath(
    outcome: 'success' | 'fail' | 'cancel',
    locale = 'en',
    query?: Record<string, string | undefined>,
  ): string {
    const base = `${this.webPublicUrl()}/${locale}/membership/payment/${outcome}`;
    if (!query) return base;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value?.trim()) params.set(key, value.trim());
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  async confirmMembershipForUser(
    userId: string,
    options?: { tranId?: string; valId?: string },
  ) {
    if (options?.tranId && options?.valId) {
      const payment = await this.prisma.membershipPayment.findFirst({
        where: { tranId: options.tranId, userId },
      });
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      const result = await this.processPayment(
        { tran_id: options.tranId, val_id: options.valId },
        'success',
      );

      if (!result.ok) {
        return this.membershipStatusResponse(userId, {
          synced: false,
          paymentStatus: payment.status,
        });
      }
    } else {
      await this.syncValidatedPaymentMembership(userId);
    }

    return this.membershipStatusResponse(userId, { synced: true });
  }

  private async syncValidatedPaymentMembership(userId: string) {
    const pendingApply = await this.prisma.membershipPayment.findMany({
      where: {
        userId,
        status: MembershipPaymentStatus.validated,
        subscriptionAppliedAt: null,
      },
      orderBy: { validatedAt: 'asc' },
      select: { id: true },
    });

    for (const payment of pendingApply) {
      await this.membership.applyValidatedPayment(payment.id);
    }

    await this.membership.recalculateSubscriptionFromPayments(userId);

    return pendingApply.at(-1) ?? null;
  }

  private async membershipStatusResponse(
    userId: string,
    meta: { synced: boolean; paymentStatus?: MembershipPaymentStatus },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, isActive: true, endsAt: true },
    });

    const snapshot = subscription
      ? {
          plan: subscription.plan,
          isActive: subscription.isActive,
          endsAt: subscription.endsAt?.toISOString() ?? null,
        }
      : null;

    return {
      synced: meta.synced,
      paymentStatus: meta.paymentStatus ?? null,
      subscription: snapshot,
      isPaidMember: isPaidMember(snapshot),
    };
  }
}
