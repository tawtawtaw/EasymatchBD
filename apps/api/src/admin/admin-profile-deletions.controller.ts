import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProfileDeletionRequestStatus } from '@prisma/client';
import { UserRole as SharedUserRole } from '@easymatch/shared';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminProfileDeletionsService } from './admin-profile-deletions.service';
import {
  CreateProfileDeletionRequestDto,
  ReviewProfileDeletionRequestDto,
} from './dto/profile-deletion-request.dto';

@Controller('admin/profile-deletions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SharedUserRole.SUPER_ADMIN)
export class AdminProfileDeletionsController {
  constructor(
    private readonly profileDeletions: AdminProfileDeletionsService,
  ) {}

  @Post()
  createRequest(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateProfileDeletionRequestDto,
  ) {
    return this.profileDeletions.createRequest(
      user.id,
      body.userId,
      body.reason,
    );
  }

  @Get()
  listRequests(@Query('status') status?: string) {
    const parsedStatus =
      status &&
      Object.values(ProfileDeletionRequestStatus).includes(
        status as ProfileDeletionRequestStatus,
      )
        ? (status as ProfileDeletionRequestStatus)
        : undefined;

    return this.profileDeletions.listRequests(parsedStatus);
  }

  @Post(':requestId/approve')
  approveRequest(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
  ) {
    return this.profileDeletions.approveRequest(requestId, user.id);
  }

  @Post(':requestId/reject')
  rejectRequest(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
    @Body() body: ReviewProfileDeletionRequestDto,
  ) {
    return this.profileDeletions.rejectRequest(
      requestId,
      user.id,
      body.reviewNote,
    );
  }

  @Delete(':requestId')
  cancelRequest(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
  ) {
    return this.profileDeletions.cancelRequest(requestId, user.id);
  }
}
