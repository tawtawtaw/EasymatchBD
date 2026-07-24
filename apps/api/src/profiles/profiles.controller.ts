import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { isStaffRole } from '@easymatch/shared';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { UpdateMaritalDto } from './dto/update-marital.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { SetCreationIntentDto } from './dto/set-creation-intent.dto';
import { DropdownsService } from '../dropdowns/dropdowns.service';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import { ProfilesService } from './profiles.service';
import { ProfilePauseService } from './profile-pause.service';
import { StaffProfilesService } from './staff-profiles.service';
import { SubscriptionAccessService } from '../subscriptions/subscription-access.service';

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly profilePause: ProfilePauseService,
    private readonly staffProfilesService: StaffProfilesService,
    private readonly dropdownsService: DropdownsService,
    private readonly privacyFieldsService: PrivacyFieldsService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  @Get('privacy-fields')
  getPrivacyFields() {
    return this.privacyFieldsService.listAll();
  }

  @Get('dropdowns')
  getAllDropdowns(@Query('locale') locale?: string) {
    return this.dropdownsService.getPublicDropdowns(undefined, locale ?? 'en');
  }

  @Get('dropdowns/:category')
  getDropdownsByCategory(
    @Param('category') category: string,
    @Query('locale') locale?: string,
  ) {
    return this.dropdownsService.getPublicDropdowns(category, locale ?? 'en');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyProfile(@CurrentUser() user: AuthUser) {
    if (isStaffRole(user.role)) {
      return this.staffProfilesService.getMyStaffProfile(user.id);
    }
    return this.profilesService.getMyProfile(user.id);
  }

  @Post('me/creation-intent')
  @UseGuards(JwtAuthGuard)
  setCreationIntent(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetCreationIntentDto,
  ) {
    if (isStaffRole(user.role)) {
      throw new ForbiddenException('Staff accounts cannot set member creation intent');
    }
    return this.profilesService.setCreationIntent(user.id, dto);
  }

  @Get('me/biodata-export')
  @UseGuards(JwtAuthGuard)
  async exportMyBiodata(
    @CurrentUser() user: AuthUser,
    @Query('level') level?: string,
  ) {
    this.assertMemberProfile(user);
    await this.subscriptionAccess.assertPaidMember(user.id);
    const parsed = level !== undefined ? Number(level) : 0;
    return this.profilesService.exportBiodataAtLevel(user.id, parsed);
  }

  @Get('staff/me')
  @UseGuards(JwtAuthGuard)
  getMyStaffProfile(@CurrentUser() user: AuthUser) {
    return this.staffProfilesService.getMyStaffProfile(user.id);
  }

  @Put('staff/me')
  @UseGuards(JwtAuthGuard)
  updateStaffProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateStaffDto,
  ) {
    this.assertStaffProfile(user);
    return this.staffProfilesService.updateStaffProfile(user.id, dto);
  }

  @Put('me/personal')
  @UseGuards(JwtAuthGuard)
  updatePersonal(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePersonalDto,
  ) {
    this.assertMemberProfile(user);
    return this.profilesService.updatePersonal(user.id, dto);
  }

  @Put('me/family')
  @UseGuards(JwtAuthGuard)
  updateFamily(@CurrentUser() user: AuthUser, @Body() dto: UpdateFamilyDto) {
    this.assertMemberProfile(user);
    return this.profilesService.updateFamily(user.id, dto);
  }

  @Put('me/partner')
  @UseGuards(JwtAuthGuard)
  updatePartner(@CurrentUser() user: AuthUser, @Body() dto: UpdatePartnerDto) {
    this.assertMemberProfile(user);
    return this.profilesService.updatePartner(user.id, dto);
  }

  @Put('me/marital')
  @UseGuards(JwtAuthGuard)
  updateMarital(@CurrentUser() user: AuthUser, @Body() dto: UpdateMaritalDto) {
    this.assertMemberProfile(user);
    return this.profilesService.updateMarital(user.id, dto);
  }

  @Post('me/pause')
  @UseGuards(JwtAuthGuard)
  pauseMyProfile(@CurrentUser() user: AuthUser) {
    this.assertMemberProfile(user);
    return this.profilePause.pauseProfile(user.id);
  }

  @Post('me/reactivate')
  @UseGuards(JwtAuthGuard)
  reactivateMyProfile(@CurrentUser() user: AuthUser) {
    this.assertMemberProfile(user);
    return this.profilePause.reactivateProfile(user.id);
  }

  @Get('me/pause-status')
  @UseGuards(JwtAuthGuard)
  getMyPauseStatus(@CurrentUser() user: AuthUser) {
    this.assertMemberProfile(user);
    return this.profilePause.getStatus(user.id);
  }

  private assertMemberProfile(user: AuthUser) {
    if (isStaffRole(user.role)) {
      throw new ForbiddenException(
        'Staff accounts use the staff profile endpoint',
      );
    }
  }

  private assertStaffProfile(user: AuthUser) {
    if (!isStaffRole(user.role)) {
      throw new ForbiddenException(
        'Only staff accounts can update the staff profile',
      );
    }
  }
}
