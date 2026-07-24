import {
  BadRequestException,
  Controller,
  NotFoundException,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isStaffRole } from '@easymatch/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetMembershipDto } from './dto/set-membership.dto';
import { MembershipService } from './membership.service';

@Controller('dev/membership')
@UseGuards(JwtAuthGuard)
export class DevMembershipController {
  constructor(
    private readonly membership: MembershipService,
    private readonly config: ConfigService,
  ) {}

  @Patch()
  setMyMembership(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetMembershipDto,
  ) {
    if (this.config.get<string>('NODE_ENV', 'development') === 'production') {
      throw new NotFoundException();
    }

    if (isStaffRole(user.role)) {
      throw new BadRequestException(
        'Staff accounts do not use member subscriptions',
      );
    }

    return this.membership.setPlan(user.id, dto.plan);
  }
}
