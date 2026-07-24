import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ComplaintWorkflowService } from './complaint-workflow.service';
import { ComplaintInvestigationService } from './complaint-investigation.service';
import { MemberComplaintsService } from './member-complaints.service';
import { CreateMemberComplaintDto } from './dto/create-member-complaint.dto';
import {
  CreateComplaintDiaryEntryDto,
  UpdateComplaintDiaryEntryDto,
} from './dto/complaint-diary.dto';
import { SendComplaintMessageDto } from './dto/complaint-message.dto';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';

@Controller('complaints')
@UseGuards(JwtAuthGuard)
export class ComplaintsController {
  constructor(
    private readonly complaints: MemberComplaintsService,
    private readonly workflow: ComplaintWorkflowService,
  ) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMemberComplaintDto) {
    return this.complaints.create(user.id, user.role, dto);
  }

  @Get('targets/lookup')
  lookupTarget(
    @CurrentUser() user: AuthUser,
    @Query('profileCode') profileCode: string,
  ) {
    return this.complaints.lookupTargetProfile(user.id, user.role, profileCode);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.complaints.listForMember(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.complaints.getDetail(user.id, user.role, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.complaints.cancel(user.id, id);
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
}

@Controller('consultant/complaints')
@UseGuards(JwtAuthGuard)
export class ConsultantComplaintsController {
  constructor(
    private readonly complaints: MemberComplaintsService,
    private readonly workflow: ComplaintWorkflowService,
    private readonly investigation: ComplaintInvestigationService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    this.complaints.assertConsultantRole(user.role);
    return this.complaints.listForConsultant(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.complaints.assertConsultantRole(user.role);
    return this.complaints.getDetail(user.id, user.role, id);
  }

  @Post(':id/assign')
  assign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.complaints.assertConsultantRole(user.role);
    return this.complaints.assign(user.id, id);
  }

  @Put(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateComplaintStatusDto,
  ) {
    this.complaints.assertConsultantRole(user.role);
    return this.complaints.updateStatus(user.id, id, dto.status);
  }

  @Post(':id/resolve')
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveComplaintDto,
  ) {
    this.complaints.assertConsultantRole(user.role);
    return this.complaints.resolve(user.id, id, dto.status, dto.resolutionNote, user.role);
  }

  @Get(':id/chat-history')
  getChatHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.complaints.assertConsultantRole(user.role);
    return this.investigation.getChatHistory(user.id, user.role, id);
  }

  @Get(':id/messages')
  listMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.complaints.assertConsultantRole(user.role);
    return this.workflow.listMessages(user.id, user.role, id);
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendComplaintMessageDto,
  ) {
    this.complaints.assertConsultantRole(user.role);
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
    this.complaints.assertConsultantRole(user.role);
    return this.workflow.listDiary(user.id, user.role, id);
  }

  @Post(':id/diary')
  createDiary(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateComplaintDiaryEntryDto,
  ) {
    this.complaints.assertConsultantRole(user.role);
    return this.workflow.createDiaryEntry(user.id, user.role, id, dto.body);
  }

  @Put(':id/diary/:entryId')
  updateDiary(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateComplaintDiaryEntryDto,
  ) {
    this.complaints.assertConsultantRole(user.role);
    return this.workflow.updateDiaryEntry(
      user.id,
      user.role,
      id,
      entryId,
      dto.body,
    );
  }

  @Delete(':id/diary/:entryId')
  deleteDiary(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    this.complaints.assertConsultantRole(user.role);
    return this.workflow.deleteDiaryEntry(user.id, user.role, id, entryId);
  }
}
