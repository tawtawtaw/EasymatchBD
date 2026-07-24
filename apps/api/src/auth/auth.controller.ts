import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './decorators/current-user.decorator';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { RegisterDevicePushTokenDto } from './dto/register-device-push-token.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { RestoreDeviceDto } from './dto/restore-device.dto';
import { RevokeDeviceDto } from './dto/revoke-device.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StaffRegisterDto } from './dto/staff-register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone, dto.purpose ?? 'member');
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(
      dto.phone,
      dto.code,
      dto.purpose ?? 'member',
      dto.rememberDevice ?? true,
    );
  }

  @Post('device/restore')
  restoreDevice(@Body() dto: RestoreDeviceDto) {
    return this.authService.restoreDeviceSession(
      dto.phone,
      dto.deviceToken,
      dto.purpose ?? 'member',
    );
  }

  @Post('device/revoke')
  revokeDevice(@Body() dto: RevokeDeviceDto) {
    return this.authService.revokeDeviceSession(dto.deviceToken);
  }

  @Post('device/push-token')
  registerDevicePushToken(@Body() dto: RegisterDevicePushTokenDto) {
    return this.authService.registerPushTokenForDevice(
      dto.phone,
      dto.deviceToken,
      dto.token,
      dto.platform,
    );
  }

  @Post('staff/register')
  /** @deprecated Staff sign-in uses mobile OTP. Kept for legacy integrations. */
  registerStaff(@Body() dto: StaffRegisterDto) {
    return this.authService.registerStaff(
      dto.email,
      dto.password,
      dto.fullName,
    );
  }

  @Post('staff/login')
  /** @deprecated Staff sign-in uses mobile OTP. Kept for legacy integrations. */
  loginStaff(@Body() dto: StaffLoginDto) {
    return this.authService.loginStaff(dto.email, dto.password);
  }

  @Get('me/session')
  @UseGuards(JwtAuthGuard)
  getSession(@CurrentUser() user: AuthUser) {
    return this.authService.getSession(user);
  }

  @Get('me/redirect-hint')
  @UseGuards(JwtAuthGuard)
  getRedirectHint(@CurrentUser() user: AuthUser) {
    return this.authService.getRedirectHint(user);
  }

  @Get('me/biodata-bootstrap')
  @UseGuards(JwtAuthGuard)
  getBiodataBootstrap(
    @CurrentUser() user: AuthUser,
    @Query('level') level?: string,
    @Query('locale') locale?: string,
  ) {
    const parsed = level !== undefined ? Number(level) : 0;
    return this.authService.getBiodataBootstrap(
      user.id,
      parsed,
      locale ?? 'en',
    );
  }

  @Get('me/editor-bootstrap')
  @UseGuards(JwtAuthGuard)
  getEditorBootstrap(
    @CurrentUser() user: AuthUser,
    @Query('locale') locale?: string,
  ) {
    return this.authService.getEditorBootstrap(user, locale ?? 'en');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthUser, @Query('full') full?: string) {
    return this.authService.getProfile(user, full === '1');
  }

  @Post('terms/accept')
  @UseGuards(JwtAuthGuard)
  acceptTerms(
    @CurrentUser() user: AuthUser,
    @Body() dto: AcceptTermsDto,
  ) {
    return this.authService.acceptTerms(user.id, dto.version);
  }

  @Post('terms/decline')
  @UseGuards(JwtAuthGuard)
  declineTerms(@CurrentUser() user: AuthUser) {
    return this.authService.declineTerms(user.id);
  }

  @Post('me/push-tokens')
  @UseGuards(JwtAuthGuard)
  registerPushToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.authService.registerPushToken(
      user.id,
      dto.token,
      dto.platform,
    );
  }

  @Post('me/push-tokens/remove')
  @UseGuards(JwtAuthGuard)
  removePushToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.authService.removePushToken(user.id, dto.token);
  }

  @Get('me/push-tokens/status')
  @UseGuards(JwtAuthGuard)
  getPushTokenStatus(@CurrentUser() user: AuthUser) {
    return this.authService.getPushTokenStatus(user.id);
  }
}
