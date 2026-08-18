import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MIN_CONSULTANT_PRIVACY_LEVEL } from '@easymatch/shared';
import {
  ConsultantEngagementStatus,
  ConsultantPaymentStatus,
  ConsultantServiceType,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../subscriptions/subscription-access.service';
import type {
  SslCommerzInitResponse,
  SslCommerzValidationResponse,
} from '../subscriptions/sslcommerz.types';
import { ConsultantEngagementsService } from './consultant-engagements.service';
import { ConsultantTariffsService } from './consultant-tariffs.service';

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
export class ConsultantPaymentService {
  private readonly gateway: InstanceType<typeof SSLCommerzPayment> | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tariffs: ConsultantTariffsService,
    private readonly engagements: ConsultantEngagementsService,
    private readonly subscriptionAccess: SubscriptionAccessService,
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
    return `${this.webPublicUrl()}/api/v1/consultant/payments/sslcommerz`;
  }

  private async requireConnectionAtLevel(userId: string, connectionId: string) {
    const connection = await this.prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        userLow: { select: { id: true, isActive: true } },
        userHigh: { select: { id: true, isActive: true } },
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const isMember =
      connection.userLowId === userId || connection.userHighId === userId;
    if (!isMember) {
      throw new ForbiddenException('Not a member of this connection');
    }

    if (connection.endedAt) {
      throw new ForbiddenException('This connection has ended');
    }

    if (!connection.userLow.isActive || !connection.userHigh.isActive) {
      throw new ForbiddenException('Connection is not active');
    }

    if (connection.privacyLevel < MIN_CONSULTANT_PRIVACY_LEVEL) {
      throw new ForbiddenException(
        `Marriage consultant services require privacy level ${MIN_CONSULTANT_PRIVACY_LEVEL} or higher`,
      );
    }

    return connection;
  }

  async createCheckout(
    userId: string,
    connectionId: string,
    serviceType: string,
    memberNotes?: string,
  ) {
    if (!this.gateway) {
      throw new ServiceUnavailableException(
        'SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD.',
      );
    }

    await this.subscriptionAccess.assertPaidMember(userId);
    await this.requireConnectionAtLevel(userId, connectionId);

    const tariff = await this.tariffs.getByServiceType(serviceType);
    if (!tariff.isActive) {
      throw new BadRequestException('This consultant service is not available.');
    }

    const activeDuplicate =
      await this.prisma.consultantEngagement.findFirst({
        where: {
          connectionId,
          serviceType: serviceType as ConsultantServiceType,
          status: {
            in: [
              ConsultantEngagementStatus.queued,
              ConsultantEngagementStatus.assigned,
              ConsultantEngagementStatus.in_progress,
            ],
          },
        },
      });

    if (activeDuplicate) {
      throw new BadRequestException(
        'An active consultant request already exists for this service on this connection.',
      );
    }

    const pendingPayment = await this.prisma.consultantPayment.findFirst({
      where: {
        connectionId,
        serviceType: serviceType as ConsultantServiceType,
        status: ConsultantPaymentStatus.pending,
      },
    });

    if (pendingPayment) {
      throw new BadRequestException(
        'A consultant payment is already pending for this service.',
      );
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
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const amount = new Prisma.Decimal(tariff.priceBdt);
    const tranId = `EC-${randomBytes(6).toString('hex')}-${Date.now()}`;
    const callbackBase = this.callbackBaseUrl();
    const trimmedNotes = memberNotes?.trim() || null;

    await this.prisma.consultantPayment.create({
      data: {
        userId,
        connectionId,
        serviceType: serviceType as ConsultantServiceType,
        serviceLabelEn: tariff.labelEn,
        tranId,
        amountBdt: amount,
        currency: tariff.currency,
        memberNotes: trimmedNotes,
      },
    });

    const customerName =
      user.profile?.fullName?.trim() || 'EasymatchBD Member';
    const customerPhone =
      user.phone?.replace(/\D/g, '').slice(-11) || '01700000000';
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
      product_name: tariff.labelEn,
      product_category: 'Consultant',
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
      value_b: connectionId,
      value_c: serviceType,
    });

    if (initResponse.status !== 'SUCCESS' || !initResponse.GatewayPageURL) {
      await this.prisma.consultantPayment.update({
        where: { tranId },
        data: {
          status: ConsultantPaymentStatus.failed,
          sslResponse: initResponse as Prisma.InputJsonValue,
          sslStatus: initResponse.status ?? 'INIT_FAILED',
        },
      });
      throw new BadRequestException(
        initResponse.failedreason || 'Could not start SSLCommerz checkout.',
      );
    }

    await this.prisma.consultantPayment.update({
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

    const payment = await this.prisma.consultantPayment.findUnique({
      where: { tranId },
    });

    if (!payment) {
      return { ok: false as const, payment: null };
    }

    if (outcome === 'fail' || outcome === 'cancel') {
      if (payment.status === ConsultantPaymentStatus.pending) {
        await this.prisma.consultantPayment.update({
          where: { id: payment.id },
          data: {
            status:
              outcome === 'cancel'
                ? ConsultantPaymentStatus.cancelled
                : ConsultantPaymentStatus.failed,
            sslStatus: payload.status ?? outcome,
          },
        });
      }
      return { ok: true as const, payment };
    }

    if (payment.status === ConsultantPaymentStatus.validated) {
      await this.engagements.ensureEngagementForPayment(payment.id);
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
      await this.prisma.consultantPayment.update({
        where: { id: payment.id },
        data: {
          status: ConsultantPaymentStatus.failed,
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

    await this.prisma.consultantPayment.update({
      where: { id: payment.id },
      data: {
        status: ConsultantPaymentStatus.validated,
        valId,
        validatedAt: new Date(),
        sslStatus: validation.status,
        sslResponse: validation as Prisma.InputJsonValue,
      },
    });

    await this.engagements.ensureEngagementForPayment(payment.id);

    return { ok: true as const, payment };
  }

  webRedirectPath(
    outcome: 'success' | 'fail' | 'cancel',
    locale = 'en',
    query?: Record<string, string | undefined>,
  ): string {
    const base = `${this.webPublicUrl()}/${locale}/connections/consultant/payment/${outcome}`;
    if (!query) return base;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value?.trim()) params.set(key, value.trim());
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  async confirmForUser(
    userId: string,
    options?: { tranId?: string; valId?: string },
  ) {
    if (options?.tranId && options?.valId) {
      const payment = await this.prisma.consultantPayment.findFirst({
        where: { tranId: options.tranId, userId },
        include: { engagement: true },
      });
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      const result = await this.processPayment(
        { tran_id: options.tranId, val_id: options.valId },
        'success',
      );

      if (!result.ok) {
        return {
          synced: false,
          paymentStatus: payment.status,
          engagement: payment.engagement
            ? this.engagements.toDto(payment.engagement)
            : null,
        };
      }

      const refreshed = await this.prisma.consultantPayment.findUnique({
        where: { id: payment.id },
        include: { engagement: true },
      });

      return {
        synced: true,
        paymentStatus: refreshed?.status ?? payment.status,
        engagement: refreshed?.engagement
          ? this.engagements.toDto(refreshed.engagement)
          : null,
      };
    }

    return { synced: true, paymentStatus: null, engagement: null };
  }
}
