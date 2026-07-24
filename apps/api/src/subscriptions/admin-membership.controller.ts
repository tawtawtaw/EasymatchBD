import { Controller, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SetMembershipDto } from './dto/set-membership.dto';
import { MembershipService } from './membership.service';

@Controller('admin/membership')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminMembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Patch(':userId')
  setMemberMembership(
    @Param('userId') userId: string,
    @Body() dto: SetMembershipDto,
  ) {
    return this.membership.setPlan(userId, dto.plan);
  }
}
