import {
  BadRequestException,
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
import { isStaffRole } from '@easymatch/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateConsultantCheckoutDto } from './dto/create-consultant-checkout.dto';
import { ConfirmConsultantPaymentDto } from './dto/confirm-consultant-payment.dto';
import { UpdateConsultantCaseStatusDto } from './dto/update-consultant-case-status.dto';
import {
  CreateConsultantDiaryEntryDto,
  ScheduleConsultantMeetingDto,
  SendConsultantCaseMessageDto,
  UpdateConsultantDiaryEntryDto,
} from './dto/consultant-case-workflow.dto';
import { ConsultantCaseWorkflowService } from './consultant-case-workflow.service';
import { ConsultantEngagementsService } from './consultant-engagements.service';
import { ConsultantPaymentService } from './consultant-payment.service';

@Controller('consultant')
@UseGuards(JwtAuthGuard)
export class ConsultantController {
  constructor(
    private readonly payments: ConsultantPaymentService,
    private readonly engagements: ConsultantEngagementsService,
    private readonly caseWorkflow: ConsultantCaseWorkflowService,
  ) {}

  @Post('checkout')
  checkout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateConsultantCheckoutDto,
  ) {
    if (isStaffRole(user.role)) {
      throw new BadRequestException(
        'Staff accounts cannot request marriage consultant services',
      );
    }

    return this.payments.createCheckout(
      user.id,
      dto.connectionId,
      dto.serviceType,
      dto.memberNotes,
    );
  }

  @Post('payments/confirm')
  confirmPayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConfirmConsultantPaymentDto,
  ) {
    return this.payments.confirmForUser(user.id, {
      tranId: dto.tranId,
      valId: dto.valId,
    });
  }

  @Get('engagements')
  listEngagements(
    @CurrentUser() user: AuthUser,
    @Query('connectionId') connectionId?: string,
  ) {
    if (!connectionId?.trim()) {
      throw new BadRequestException('connectionId is required');
    }
    return this.engagements.listForConnection(user.id, connectionId.trim());
  }

  @Get('cases')
  listCases(@CurrentUser() user: AuthUser) {
    this.engagements.assertConsultantRole(user.role);
    return this.engagements.listCasesForConsultant(user.id);
  }

  @Post('cases/:id/assign')
  assignCase(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.engagements.assertConsultantRole(user.role);
    return this.engagements.assignCase(user.id, id);
  }

  @Put('cases/:id/status')
  updateCaseStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateConsultantCaseStatusDto,
  ) {
    this.engagements.assertConsultantRole(user.role);
    return this.engagements.updateCaseStatus(user.id, id, dto.status);
  }

  @Get('cases/:id')
  getCase(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.caseWorkflow.getCaseDetail(user.id, user.role, id);
  }

  @Get('cases/:id/messages')
  listCaseMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.caseWorkflow.listMessages(user.id, user.role, id);
  }

  @Post('cases/:id/messages')
  sendCaseMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendConsultantCaseMessageDto,
  ) {
    return this.caseWorkflow.sendMessage(
      user.id,
      user.role,
      id,
      dto.body,
      dto.recipientId,
    );
  }

  @Get('cases/:id/diary')
  listDiary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.engagements.assertConsultantRole(user.role);
    return this.caseWorkflow.listDiary(user.id, user.role, id);
  }

  @Post('cases/:id/diary')
  createDiaryEntry(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateConsultantDiaryEntryDto,
  ) {
    this.engagements.assertConsultantRole(user.role);
    return this.caseWorkflow.createDiaryEntry(user.id, user.role, id, dto.body);
  }

  @Put('cases/:id/diary/:entryId')
  updateDiaryEntry(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateConsultantDiaryEntryDto,
  ) {
    this.engagements.assertConsultantRole(user.role);
    return this.caseWorkflow.updateDiaryEntry(
      user.id,
      user.role,
      id,
      entryId,
      dto.body,
    );
  }

  @Delete('cases/:id/diary/:entryId')
  deleteDiaryEntry(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    this.engagements.assertConsultantRole(user.role);
    return this.caseWorkflow.deleteDiaryEntry(user.id, user.role, id, entryId);
  }

  @Get('cases/:id/meetings')
  listMeetings(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.caseWorkflow.listMeetings(user.id, user.role, id);
  }

  @Post('cases/:id/meetings')
  scheduleMeeting(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ScheduleConsultantMeetingDto,
  ) {
    this.engagements.assertConsultantRole(user.role);
    return this.caseWorkflow.scheduleMeeting(user.id, user.role, id, dto);
  }

  @Post('cases/:id/meetings/:meetingId/cancel')
  cancelMeeting(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('meetingId') meetingId: string,
  ) {
    this.engagements.assertConsultantRole(user.role);
    return this.caseWorkflow.cancelMeeting(user.id, user.role, id, meetingId);
  }

  @Post('cases/:id/link-video-call/:callId')
  linkVideoCall(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('callId') callId: string,
  ) {
    return this.caseWorkflow.linkVideoCall(user.id, user.role, id, callId);
  }

  @Get('video-calls/:callId/livekit-token')
  getConsultantLiveKitToken(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
  ) {
    this.engagements.assertConsultantRole(user.role);
    return this.caseWorkflow.getConsultantLiveKitToken(
      user.id,
      user.role,
      callId,
    );
  }
}
