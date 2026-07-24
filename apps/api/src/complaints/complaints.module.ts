import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminComplaintsController } from './admin-complaints.controller';
import { AdminComplaintsService } from './admin-complaints.service';
import {
  ComplaintsController,
  ConsultantComplaintsController,
} from './complaints.controller';
import { ComplaintInvestigationService } from './complaint-investigation.service';
import { ComplaintWorkflowService } from './complaint-workflow.service';
import { MemberComplaintsService } from './member-complaints.service';

@Module({
  imports: [SubscriptionsModule, AuthModule],
  controllers: [
    ComplaintsController,
    ConsultantComplaintsController,
    AdminComplaintsController,
  ],
  providers: [
    MemberComplaintsService,
    ComplaintWorkflowService,
    ComplaintInvestigationService,
    AdminComplaintsService,
  ],
  exports: [
    MemberComplaintsService,
    ComplaintWorkflowService,
    ComplaintInvestigationService,
    AdminComplaintsService,
  ],
})
export class ComplaintsModule {}
