import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { ConsultantEngagementStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConsultantCaseWorkflowService } from '../consultant/consultant-case-workflow.service';
import { ConsultantEngagementsService } from '../consultant/consultant-engagements.service';

@Controller('admin/consultant/cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminConsultantCasesController {
  constructor(
    private readonly engagements: ConsultantEngagementsService,
    private readonly caseWorkflow: ConsultantCaseWorkflowService,
  ) {}

  @Get()
  list(@Query('status') status?: string) {
    const parsedStatus =
      status &&
      Object.values(ConsultantEngagementStatus).includes(
        status as ConsultantEngagementStatus,
      )
        ? (status as ConsultantEngagementStatus)
        : undefined;
    return this.engagements.listAllForAdmin(parsedStatus);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.caseWorkflow.getCaseDetail(user.id, user.role, id);
  }
}
