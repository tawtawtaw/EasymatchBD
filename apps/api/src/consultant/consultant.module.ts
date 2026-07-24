import { Module } from '@nestjs/common';
import { AdminConsultantPaymentsController } from './admin-consultant-payments.controller';
import { AdminConsultantPaymentsService } from './admin-consultant-payments.service';
import { AdminConsultantTariffsController } from './admin-consultant-tariffs.controller';
import { ConsultantCaseWorkflowService } from './consultant-case-workflow.service';
import { ConsultantController } from './consultant.controller';
import { ConsultantEngagementsService } from './consultant-engagements.service';
import { ConsultantPaymentService } from './consultant-payment.service';
import { ConsultantSslCommerzCallbackController } from './consultant-sslcommerz-callback.controller';
import { ConsultantTariffsController } from './consultant-tariffs.controller';
import { ConsultantTariffsService } from './consultant-tariffs.service';
import { LiveKitService } from '../discovery/livekit.service';

@Module({
  controllers: [
    AdminConsultantPaymentsController,
    AdminConsultantTariffsController,
    ConsultantTariffsController,
    ConsultantController,
    ConsultantSslCommerzCallbackController,
  ],
  providers: [
    ConsultantTariffsService,
    ConsultantEngagementsService,
    ConsultantPaymentService,
    ConsultantCaseWorkflowService,
    AdminConsultantPaymentsService,
    LiveKitService,
  ],
  exports: [
    ConsultantTariffsService,
    ConsultantEngagementsService,
    ConsultantPaymentService,
    ConsultantCaseWorkflowService,
  ],
})
export class ConsultantModule {}
