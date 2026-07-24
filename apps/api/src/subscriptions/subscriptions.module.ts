import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminMembershipPaymentsController } from './admin-membership-payments.controller';
import { AdminMembershipPaymentsService } from './admin-membership-payments.service';
import { AdminMembershipController } from './admin-membership.controller';
import { AdminMembershipTariffsController } from './admin-membership-tariffs.controller';
import { DevMembershipController } from './dev-membership.controller';
import { MembershipAccountController } from './membership-account.controller';
import { MembershipAccountService } from './membership-account.service';
import { MembershipCheckoutController } from './membership-checkout.controller';
import { MembershipPaymentsController } from './membership-payments.controller';
import { MembershipPaymentService } from './membership-payment.service';
import { MembershipTariffsController } from './membership-tariffs.controller';
import { MembershipService } from './membership.service';
import { MembershipTariffsService } from './membership-tariffs.service';
import { SslCommerzCallbackController } from './sslcommerz-callback.controller';
import { SubscriptionAccessService } from './subscription-access.service';

const devControllers =
  process.env.NODE_ENV === 'production' ? [] : [DevMembershipController];

@Global()
@Module({
  imports: [AuthModule],
  controllers: [
    ...devControllers,
    AdminMembershipController,
    AdminMembershipTariffsController,
    MembershipTariffsController,
    MembershipCheckoutController,
    MembershipPaymentsController,
    MembershipAccountController,
    SslCommerzCallbackController,
    AdminMembershipPaymentsController,
  ],
  providers: [
    SubscriptionAccessService,
    MembershipService,
    MembershipTariffsService,
    MembershipPaymentService,
    MembershipAccountService,
    AdminMembershipPaymentsService,
  ],
  exports: [
    SubscriptionAccessService,
    MembershipService,
    MembershipTariffsService,
    MembershipPaymentService,
    MembershipAccountService,
    AdminMembershipPaymentsService,
  ],
})
export class SubscriptionsModule {}
