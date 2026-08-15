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
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NidDocumentSide, NidDocumentSubject, ProfilePhotoType } from '@prisma/client';
import { parsePhotoVariant } from '@easymatch/shared';
import { memoryStorage } from 'multer';
import { MAX_NID_BYTES, MAX_PHOTO_BYTES } from '../storage/storage.constants';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';

@Controller('profiles/me')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('media')
  getMedia(@CurrentUser() user: AuthUser) {
    return this.mediaService.getMediaSummary(user.id);
  }

  @Post('verification/submit')
  submitForVerification(@CurrentUser() user: AuthUser) {
    return this.mediaService.submitForVerification(user.id);
  }

  @Get('verification/feedback')
  getVerificationFeedback(@CurrentUser() user: AuthUser) {
    return this.mediaService.getVerificationFeedback(user.id);
  }

  @Post('verification/alerts/dismiss')
  dismissVerificationAlerts(
    @CurrentUser() user: AuthUser,
    @Body() body: { alertIds?: string[] },
  ) {
    return this.mediaService.dismissVerificationAlerts(user.id, body.alertIds);
  }

  @Post('photos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_BYTES },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type?: string,
    @Query('slot') slot?: string,
  ) {
    const photoType = this.parsePhotoType(type);
    const gallerySlot = this.parseGallerySlot(slot);
    return this.mediaService.uploadPhoto(user.id, file, photoType, gallerySlot);
  }

  @Delete('photos/:id')
  deletePhoto(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mediaService.deletePhoto(user.id, id);
  }

  @Put('photos/:id/primary')
  setPrimaryPhoto(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mediaService.setPrimaryPhoto(user.id, id);
  }

  @Get('photos/:id/file')
  async getPhotoFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('variant') variant?: string,
  ) {
    const { stream, mimeType } = await this.mediaService.getPhotoFile(
      user.id,
      id,
      parsePhotoVariant(variant),
    );
    return new StreamableFile(stream, { type: mimeType });
  }

  @Post('nid')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_NID_BYTES },
    }),
  )
  uploadNid(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('side') side?: string,
    @Query('subject') subject?: string,
  ) {
    const nidSide = this.parseNidSide(side);
    return this.mediaService.uploadNid(
      user.id,
      file,
      nidSide,
      this.parseNidSubject(subject),
    );
  }

  @Delete('nid/:side')
  deleteNid(
    @CurrentUser() user: AuthUser,
    @Param('side') side: string,
    @Query('subject') subject?: string,
  ) {
    return this.mediaService.deleteNid(
      user.id,
      this.parseNidSide(side),
      this.parseNidSubject(subject),
    );
  }

  @Get('nid/:side/file')
  async getNidFile(
    @CurrentUser() user: AuthUser,
    @Param('side') side: string,
    @Query('subject') subject?: string,
  ) {
    const { stream, mimeType } = await this.mediaService.getNidFile(
      user.id,
      this.parseNidSide(side),
      this.parseNidSubject(subject),
    );
    return new StreamableFile(stream, { type: mimeType });
  }

  private parsePhotoType(type?: string): ProfilePhotoType {
    if (type === 'primary' || type === 'gallery') {
      return type as ProfilePhotoType;
    }
    throw new BadRequestException('Photo type must be primary or gallery');
  }

  private parseGallerySlot(slot?: string) {
    if (!slot) {
      return undefined;
    }
    if (slot === 'other' || slot === 'family') {
      return slot;
    }
    throw new BadRequestException('Gallery slot must be other or family');
  }

  private parseNidSide(side?: string): NidDocumentSide {
    if (side === 'front' || side === 'back') {
      return side as NidDocumentSide;
    }
    throw new BadRequestException('NID side must be front or back');
  }

  private parseNidSubject(subject?: string): NidDocumentSubject {
    if (subject === 'creator' || subject === 'member') {
      return subject as NidDocumentSubject;
    }
    return NidDocumentSubject.member;
  }
}
