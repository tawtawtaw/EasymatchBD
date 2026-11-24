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
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { parsePhotoVariant, UserRole } from '@easymatch/shared';
import { NidDocumentSide, NidDocumentSubject } from '@prisma/client';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StaffAuditService } from '../audit/staff-audit.service';
import { UpdateFamilyDto } from '../profiles/dto/update-family.dto';
import { UpdateMaritalDto } from '../profiles/dto/update-marital.dto';
import { UpdatePartnerDto } from '../profiles/dto/update-partner.dto';
import { UpdatePersonalDto } from '../profiles/dto/update-personal.dto';
import {
  NID_FILE_CACHE_CONTROL,
  photoCacheControl,
} from '../storage/photo-cache-headers';
import { MAX_NID_BYTES, MAX_PHOTO_BYTES } from '../storage/storage.constants';
import { CreateStaffAssistedDto } from './dto/create-staff-assisted.dto';
import { ReviewDecisionDto } from './dto/review-decision.dto';
import { StaffAssistedService } from './staff-assisted.service';
import { VerificationService } from './verification.service';

@Controller('verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VERIFICATION_OFFICER, UserRole.SUPER_ADMIN)
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly staffAssisted: StaffAssistedService,
    private readonly staffAudit: StaffAuditService,
  ) {}

  @Get('queue')
  getQueue(
    @Query('q') q?: string,
    @Query('creationMode') creationMode?: string,
    @Query('gender') gender?: string,
  ) {
    return this.verificationService.getQueue({ q, creationMode, gender });
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

  @Post('staff-assisted')
  createStaffAssisted(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateStaffAssistedDto,
  ) {
    return this.staffAssisted.create(user, dto);
  }

  @Put('staff-assisted/:profileId/personal')
  updateStaffAssistedPersonal(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
    @Body() dto: UpdatePersonalDto,
    @Query('reason') reason?: string,
  ) {
    return this.staffAssisted.updatePersonal(user, profileId, dto, reason);
  }

  @Put('staff-assisted/:profileId/family')
  updateStaffAssistedFamily(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
    @Body() dto: UpdateFamilyDto,
    @Query('reason') reason?: string,
  ) {
    return this.staffAssisted.updateFamily(user, profileId, dto, reason);
  }

  @Put('staff-assisted/:profileId/partner')
  updateStaffAssistedPartner(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
    @Body() dto: UpdatePartnerDto,
    @Query('reason') reason?: string,
  ) {
    return this.staffAssisted.updatePartner(user, profileId, dto, reason);
  }

  @Put('staff-assisted/:profileId/marital')
  updateStaffAssistedMarital(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
    @Body() dto: UpdateMaritalDto,
    @Query('reason') reason?: string,
  ) {
    return this.staffAssisted.updateMarital(user, profileId, dto, reason);
  }

  @Post('staff-assisted/:profileId/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_BYTES },
    }),
  )
  uploadStaffAssistedPhoto(
    @Param('profileId') profileId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type?: string,
    @Query('slot') slot?: string,
  ) {
    return this.staffAssisted.uploadPhoto(profileId, file, type, slot);
  }

  @Post('staff-assisted/:profileId/nid')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_NID_BYTES },
    }),
  )
  uploadStaffAssistedNid(
    @Param('profileId') profileId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('side') side?: string,
  ) {
    if (side !== 'front' && side !== 'back') {
      throw new BadRequestException('NID side must be front or back');
    }
    return this.staffAssisted.uploadNid(profileId, file, side);
  }

  @Delete('staff-assisted/:profileId/photos/:photoId')
  deleteStaffAssistedPhoto(
    @Param('profileId') profileId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.staffAssisted.deletePhoto(profileId, photoId);
  }

  @Delete('staff-assisted/:profileId/nid')
  deleteStaffAssistedNid(
    @Param('profileId') profileId: string,
    @Query('side') side?: string,
  ) {
    if (side !== 'front' && side !== 'back') {
      throw new BadRequestException('NID side must be front or back');
    }
    return this.staffAssisted.deleteNid(profileId, side);
  }

  @Post('staff-assisted/:profileId/submit')
  submitStaffAssisted(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    return this.staffAssisted.submit(user, profileId);
  }

  @Post('photos/:photoId/review')
  async reviewPhoto(
    @Param('photoId') photoId: string,
    @Body() dto: ReviewDecisionDto,
  ) {
    // Photos (including extras on staff-assisted profiles) may be reviewed by VO or Admin.
    return this.verificationService.reviewPhoto(
      photoId,
      dto.decision,
      dto.officerMessage,
    );
  }

  @Post('profiles/:profileId/nid/review')
  async reviewNid(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
    @Body() dto: ReviewDecisionDto,
    @Query('subject') subject?: string,
  ) {
    await this.staffAssisted.assertAdminCanApprove(
      user,
      profileId,
      dto.decision,
    );
    return this.verificationService.reviewNid(
      profileId,
      dto.decision,
      this.parseNidSubject(subject),
      dto.officerMessage,
    );
  }

  @Post('profiles/:profileId/biodata/review')
  async reviewProfileBiodata(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
    @Body() dto: ReviewDecisionDto,
  ) {
    await this.staffAssisted.assertAdminCanApprove(
      user,
      profileId,
      dto.decision,
    );
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
    @Query('variant') variant: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = parsePhotoVariant(variant);
    res.setHeader('Cache-Control', photoCacheControl(parsed));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const { stream, mimeType } = await this.verificationService.getPhotoFile(
      profileId,
      photoId,
      parsed,
    );
    return new StreamableFile(stream, { type: mimeType });
  }

  @Get('profiles/:profileId/nid/:side/file')
  async getNidFile(
    @Param('profileId') profileId: string,
    @Param('side') side: string,
    @Query('subject') subject: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (side !== 'front' && side !== 'back') {
      throw new BadRequestException('NID side must be front or back');
    }
    res.setHeader('Cache-Control', NID_FILE_CACHE_CONTROL);
    res.setHeader('X-Content-Type-Options', 'nosniff');
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
