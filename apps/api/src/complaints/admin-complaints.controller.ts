import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { MemberComplaintStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminComplaintsService } from './admin-complaints.service';
import { ComplaintInvestigationService } from './complaint-investigation.service';
import { ComplaintWorkflowService } from './complaint-workflow.service';
import { MemberComplaintsService } from './member-complaints.service';
import {
  CreateComplaintDiaryEntryDto,
  UpdateComplaintDiaryEntryDto,
} from './dto/complaint-diary.dto';
import { SendComplaintMessageDto } from './dto/complaint-message.dto';
import { ReassignComplaintDto } from './dto/reassign-complaint.dto';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';

@Controller('admin/complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminComplaintsController {
  constructor(
    private readonly adminComplaints: AdminComplaintsService,
    private readonly complaints: MemberComplaintsService,
    private readonly workflow: ComplaintWorkflowService,
    private readonly investigation: ComplaintInvestigationService,
  ) {}

  @Get()
  list(@Query('status') status?: string) {
    const parsedStatus =
      status &&
      Object.values(MemberComplaintStatus).includes(
        status as MemberComplaintStatus,
      )
        ? (status as MemberComplaintStatus)
        : undefined;
    return this.adminComplaints.listAll(parsedStatus);
  }

  @Get('consultants')
  listConsultants() {
    return this.adminComplaints.listConsultants();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.adminComplaints.getDetail(id);
  }

  @Get(':id/chat-history')
  getChatHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.investigation.getChatHistory(user.id, user.role, id);
  }

  @Post(':id/reassign')
  reassign(@Param('id') id: string, @Body() dto: ReassignComplaintDto) {
    return this.adminComplaints.reassign(id, dto.consultantId ?? null);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveComplaintDto) {
    return this.adminComplaints.resolve(id, dto.status, dto.resolutionNote);
  }

  @Get(':id/messages')
  listMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workflow.listMessages(user.id, user.role, id);
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendComplaintMessageDto,
  ) {
    return this.workflow.sendMessage(
      user.id,
      user.role,
      id,
      dto.body,
      dto.isPrivate,
    );
  }

  @Get(':id/diary')
  listDiary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workflow.listDiary(user.id, user.role, id);
  }

  @Post(':id/diary')
  createDiary(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateComplaintDiaryEntryDto,
  ) {
    return this.workflow.createDiaryEntry(user.id, user.role, id, dto.body);
  }

  @Put(':id/diary/:entryId')
  updateDiary(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateComplaintDiaryEntryDto,
  ) {
    return this.workflow.updateDiaryEntry(
      user.id,
      user.role,
      id,
      entryId,
      dto.body,
    );
  }
}
