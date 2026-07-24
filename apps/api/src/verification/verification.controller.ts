import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { NidDocumentSide, NidDocumentSubject } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StaffAuditService } from '../audit/staff-audit.service';
import { ReviewDecisionDto } from './dto/review-decision.dto';
import { VerificationService } from './verification.service';

@Controller('verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VERIFICATION_OFFICER, UserRole.SUPER_ADMIN)
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly staffAudit: StaffAuditService,
  ) {}

  @Get('queue')
  getQueue() {
    return this.verificationService.getQueue();
  }

  @Get('submissions/:profileId')
  getSubmission(@Param('profileId') profileId: string) {
    return this.verificationService.getSubmission(profileId);
  }

  @Get('profiles/:profileId/biodata-export')
  async exportAuditBiodata(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    const payload = await this.verificationService.exportAuditBiodata(profileId);
    await this.staffAudit.logBiodataAuditExport(
      user,
      profileId,
      payload.profileCode,
    );
    return payload;
  }

  @Post('photos/:photoId/review')
  reviewPhoto(
    @Param('photoId') photoId: string,
    @Body() dto: ReviewDecisionDto,
  ) {
    return this.verificationService.reviewPhoto(
      photoId,
      dto.decision,
      dto.officerMessage,
    );
  }

  @Post('profiles/:profileId/nid/review')
  reviewNid(
    @Param('profileId') profileId: string,
    @Body() dto: ReviewDecisionDto,
    @Query('subject') subject?: string,
  ) {
    return this.verificationService.reviewNid(
      profileId,
      dto.decision,
      this.parseNidSubject(subject),
      dto.officerMessage,
    );
  }

  @Post('profiles/:profileId/biodata/review')
  reviewProfileBiodata(
    @Param('profileId') profileId: string,
    @Body() dto: ReviewDecisionDto,
  ) {
    return this.verificationService.reviewProfileBiodata(
      profileId,
      dto.decision,
      dto.officerMessage,
    );
  }

  @Get('profiles/:profileId/photos/:photoId/file')
  async getPhotoFile(
    @Param('profileId') profileId: string,
    @Param('photoId') photoId: string,
  ) {
    const { stream, mimeType } =
      await this.verificationService.getPhotoFile(profileId, photoId);
    return new StreamableFile(stream, { type: mimeType });
  }

  @Get('profiles/:profileId/nid/:side/file')
  async getNidFile(
    @Param('profileId') profileId: string,
    @Param('side') side: string,
    @Query('subject') subject?: string,
  ) {
    if (side !== 'front' && side !== 'back') {
      throw new BadRequestException('NID side must be front or back');
    }
    const { stream, mimeType } = await this.verificationService.getNidFile(
      profileId,
      side as NidDocumentSide,
      this.parseNidSubject(subject),
    );
    return new StreamableFile(stream, { type: mimeType });
  }

  private parseNidSubject(subject?: string): NidDocumentSubject {
    if (subject === 'creator' || subject === 'member') {
      return subject as NidDocumentSubject;
    }
    return NidDocumentSubject.member;
  }
}
