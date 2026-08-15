import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DISCOVERY_DEFAULT_PROFILE_LIMIT, clampDiscoveryProfileLimit, parsePhotoVariant } from '@easymatch/shared';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectionsService } from './connections.service';
import { parseDiscoveryFilters } from './discovery-filters';
import { DiscoveryService } from './discovery.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { CreateVideoCallDto } from './dto/create-video-call.dto';
import { PostVideoCallSignalDto } from './dto/post-video-call-signal.dto';
import { RescheduleVideoCallDto } from './dto/reschedule-video-call.dto';
import { MessagesService } from './messages.service';
import { VideoCallsService } from './video-calls.service';
import { InviteVideoCallGuestDto } from './dto/invite-video-call-guest.dto';
import { VideoCallGuestsService } from './video-call-guests.service';
import { ComparisonService } from './comparison.service';
import { SavedProfilesService } from './saved-profiles.service';
import { MemberAlertsSummaryService } from './member-alerts-summary.service';

@Controller('discovery')
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly connections: ConnectionsService,
    private readonly messages: MessagesService,
    private readonly videoCalls: VideoCallsService,
    private readonly videoCallGuests: VideoCallGuestsService,
    private readonly savedProfiles: SavedProfilesService,
    private readonly comparison: ComparisonService,
    private readonly memberAlertsSummary: MemberAlertsSummaryService,
  ) {}

  @Get('home-bootstrap')
  getHomeBootstrap(@CurrentUser() user: AuthUser) {
    return this.discovery.getHomeBootstrap(user.id);
  }

  @Get('alerts-summary')
  getAlertsSummary(@CurrentUser() user: AuthUser) {
    return this.memberAlertsSummary.getSummary(user.id);
  }

  @Get('profiles')
  listProfiles(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { page, limit, ...filterQuery } = query;
    const pageNumber = page ? Number(page) : 1;
    return this.discovery.listProfiles(
      user.id,
      pageNumber,
      clampDiscoveryProfileLimit(
        limit ? Number(limit) : DISCOVERY_DEFAULT_PROFILE_LIMIT,
      ),
      parseDiscoveryFilters(filterQuery),
      {
        lite: true,
        skipTotalCount: pageNumber > 1,
      },
    );
  }

  @Get('bookmarks')
  listSavedProfiles(@CurrentUser() user: AuthUser) {
    return this.savedProfiles.listBookmarks(user.id);
  }

  @Post('profiles/:profileId/bookmark')
  async saveProfileBookmark(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    return this.savedProfiles.saveBookmark(user.id, profileId);
  }

  @Delete('profiles/:profileId/bookmark')
  async removeProfileBookmark(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    return this.savedProfiles.removeBookmark(user.id, profileId);
  }

  @Get('connections')
  listConnections(@CurrentUser() user: AuthUser) {
    return this.connections.listMyConnections(user.id);
  }

  @Get('messages/unread-count')
  async getMessageUnreadCount(@CurrentUser() user: AuthUser) {
    try {
      return await this.messages.getUnreadCount(user.id);
    } catch {
      return { unreadCount: 0 };
    }
  }

  @Get('messages')
  listMessageConversations(@CurrentUser() user: AuthUser) {
    return this.messages.listConversations(user.id);
  }

  @Get('messages/:connectionId')
  listConnectionMessages(
    @CurrentUser() user: AuthUser,
    @Param('connectionId') connectionId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('since') since?: string,
    @Query('markRead') markRead?: string,
  ) {
    return this.messages.listMessages(
      user.id,
      connectionId,
      limit ? Number(limit) : 50,
      before,
      markRead !== 'false',
      since,
    );
  }

  @Post('messages/:connectionId/read')
  markConnectionMessagesRead(
    @CurrentUser() user: AuthUser,
    @Param('connectionId') connectionId: string,
  ) {
    return this.messages.markRead(user.id, connectionId);
  }

  @Post('messages/:connectionId/typing')
  setConnectionTyping(
    @CurrentUser() user: AuthUser,
    @Param('connectionId') connectionId: string,
  ) {
    return this.messages.setTyping(user.id, connectionId);
  }

  @Post('messages/:connectionId')
  sendConnectionMessage(
    @CurrentUser() user: AuthUser,
    @Param('connectionId') connectionId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.messages.sendMessage(user.id, connectionId, body.body);
  }

  @Post('messages/:connectionId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  sendConnectionAttachment(
    @CurrentUser() user: AuthUser,
    @Param('connectionId') connectionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    return this.messages.sendAttachment(user.id, connectionId, file, caption);
  }

  @Patch('messages/:connectionId/:messageId')
  updateConnectionMessage(
    @CurrentUser() user: AuthUser,
    @Param('connectionId') connectionId: string,
    @Param('messageId') messageId: string,
    @Body() body: UpdateMessageDto,
  ) {
    return this.messages.updateMessage(
      user.id,
      connectionId,
      messageId,
      body.body,
    );
  }

  @Delete('messages/:connectionId/:messageId')
  deleteConnectionMessage(
    @CurrentUser() user: AuthUser,
    @Param('connectionId') connectionId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messages.deleteMessage(user.id, connectionId, messageId);
  }

  @Get('messages/:connectionId/:messageId/attachment')
  async getConnectionMessageAttachment(
    @CurrentUser() user: AuthUser,
    @Param('connectionId') connectionId: string,
    @Param('messageId') messageId: string,
  ) {
    const file = await this.messages.getAttachmentStream(
      user.id,
      connectionId,
      messageId,
    );
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      disposition: `inline; filename="${encodeURIComponent(file.fileName)}"`,
    });
  }

  @Get('profiles/:profileId')
  getProfile(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    return this.discovery.getProfile(user.id, profileId);
  }

  @Get('profiles/:profileId/comparison')
  getProfileComparison(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    return this.comparison.getProfileComparison(user.id, profileId);
  }

  @Get('profiles/:profileId/photos/:photoId/file')
  @Header('Cache-Control', 'private, no-store, no-cache, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('X-Content-Type-Options', 'nosniff')
  async getPhotoFile(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
    @Param('photoId') photoId: string,
    @Query('variant') variant?: string,
  ) {
    const { stream, mimeType } = await this.discovery.getVisiblePhotoFile(
      user.id,
      profileId,
      photoId,
      parsePhotoVariant(variant),
    );
    return new StreamableFile(stream, { type: mimeType });
  }

  @Post('profiles/:profileId/interest')
  async sendInterest(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    const receiverId = await this.discovery.resolveProfileUserId(
      user.id,
      profileId,
    );
    const result = await this.connections.sendInterest(user.id, receiverId);
    this.discovery.invalidateProfileViewCache(user.id, profileId);
    this.discovery.invalidateProfileViewCache(receiverId);
    this.comparison.invalidateComparisonCache(user.id, profileId);
    this.comparison.invalidateComparisonCache(receiverId);
    return result;
  }

  @Post('interests/:interestId/respond')
  async respondInterest(
    @CurrentUser() user: AuthUser,
    @Param('interestId') interestId: string,
    @Body() body: { accept: boolean },
  ) {
    const result = await this.connections.respondToInterest(
      user.id,
      interestId,
      body.accept,
    );
    this.invalidateMemberDiscoveryViews(result.senderId, result.receiverId);
    return result;
  }

  @Get('interests')
  listInterests(@CurrentUser() user: AuthUser) {
    return this.connections.listInterests(user.id);
  }

  @Get('interests/incoming')
  listIncomingInterests(@CurrentUser() user: AuthUser) {
    return this.connections.listIncomingInterests(user.id);
  }

  @Get('interests/outgoing')
  listOutgoingInterests(@CurrentUser() user: AuthUser) {
    return this.connections.listOutgoingInterests(user.id);
  }

  @Delete('interests/:interestId')
  async withdrawInterest(
    @CurrentUser() user: AuthUser,
    @Param('interestId') interestId: string,
  ) {
    const result = await this.connections.withdrawInterest(user.id, interestId);
    this.invalidateMemberDiscoveryViews(result.senderId, result.receiverId);
    return result;
  }

  private invalidateMemberDiscoveryViews(userAId: string, userBId: string) {
    this.discovery.invalidateProfileViewCache(userAId);
    this.discovery.invalidateProfileViewCache(userBId);
    this.comparison.invalidateComparisonCache(userAId);
    this.comparison.invalidateComparisonCache(userBId);
  }

  @Post('profiles/:profileId/privacy-upgrade/request')
  async requestPrivacyUpgrade(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
  ) {
    const otherUserId = await this.discovery.resolveProfileUserId(
      user.id,
      profileId,
    );
    const result = await this.connections.requestPrivacyUpgrade(
      user.id,
      otherUserId,
    );
    this.discovery.invalidateProfileViewCache(user.id, profileId);
    this.discovery.invalidateProfileViewCache(otherUserId);
    return result;
  }

  @Post('profiles/:profileId/privacy-upgrade/respond')
  async respondPrivacyUpgrade(
    @CurrentUser() user: AuthUser,
    @Param('profileId') profileId: string,
    @Body() body: { accept: boolean },
  ) {
    const otherUserId = await this.discovery.resolveProfileUserId(
      user.id,
      profileId,
    );
    const result = await this.connections.respondPrivacyUpgrade(
      user.id,
      otherUserId,
      body.accept,
    );
    this.discovery.invalidateProfileViewCache(user.id, profileId);
    this.discovery.invalidateProfileViewCache(otherUserId);
    return result;
  }

  @Get('calls/incoming')
  listIncomingCalls(@CurrentUser() user: AuthUser) {
    return this.videoCalls.listIncoming(user.id);
  }

  @Get('calls/alerts')
  listCallAlerts(@CurrentUser() user: AuthUser) {
    return this.videoCalls.listCallAlerts(user.id);
  }

  @Get('calls/livekit-status')
  getLiveKitStatus() {
    return this.videoCalls.getLiveKitStatus();
  }

  @Get('calls/item/:callId')
  getVideoCall(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
  ) {
    return this.videoCalls.getCall(user.id, callId);
  }

  @Get('calls/:connectionId')
  listConnectionCalls(
    @CurrentUser() user: AuthUser,
    @Param('connectionId') connectionId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.videoCalls.listCalls(user.id, connectionId, {
      activeOnly: activeOnly === '1' || activeOnly === 'true',
    });
  }

  @Post('calls/:connectionId')
  createConnectionCall(
    @CurrentUser() user: AuthUser,
    @Param('connectionId') connectionId: string,
    @Body() body: CreateVideoCallDto,
  ) {
    return this.videoCalls.createCall(user.id, connectionId, body.scheduledAt);
  }

  @Post('calls/:callId/accept')
  acceptVideoCall(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
  ) {
    return this.videoCalls.acceptCall(user.id, callId);
  }

  @Post('calls/:callId/decline')
  declineVideoCall(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
  ) {
    return this.videoCalls.declineCall(user.id, callId);
  }

  @Post('calls/:callId/cancel')
  cancelVideoCall(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
  ) {
    return this.videoCalls.cancelCall(user.id, callId);
  }

  @Post('calls/:callId/reschedule')
  rescheduleVideoCall(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
    @Body() body: RescheduleVideoCallDto,
  ) {
    return this.videoCalls.rescheduleCall(user.id, callId, body.scheduledAt);
  }

  @Post('calls/:callId/start')
  startScheduledVideoCall(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
  ) {
    return this.videoCalls.startScheduledCall(user.id, callId);
  }

  @Post('calls/:callId/end')
  endVideoCall(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
  ) {
    return this.videoCalls.endCall(user.id, callId);
  }

  @Post('calls/:callId/signals')
  postVideoCallSignal(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
    @Body() body: PostVideoCallSignalDto,
  ) {
    return this.videoCalls.postSignal(user.id, callId, body.type, body.payload);
  }

  @Get('calls/:callId/signals')
  pollVideoCallSignals(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
    @Query('after') after?: string,
  ) {
    return this.videoCalls.pollSignals(user.id, callId, after);
  }

  @Get('calls/:callId/livekit-token')
  getLiveKitToken(@CurrentUser() user: AuthUser, @Param('callId') callId: string) {
    return this.videoCallGuests.getMemberLiveKitToken(user.id, callId);
  }

  @Get('calls/:callId/guests')
  listCallGuests(@CurrentUser() user: AuthUser, @Param('callId') callId: string) {
    return this.videoCallGuests.listGuests(user.id, callId);
  }

  @Post('calls/:callId/guests')
  inviteCallGuest(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
    @Body() body: InviteVideoCallGuestDto,
  ) {
    return this.videoCallGuests.inviteGuest(
      user.id,
      callId,
      body.guestName,
      body.relation,
    );
  }

  @Post('calls/:callId/guests/:guestId/approve')
  approveCallGuest(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
    @Param('guestId') guestId: string,
  ) {
    return this.videoCallGuests.approveGuest(user.id, callId, guestId);
  }

  @Post('calls/:callId/guests/:guestId/decline')
  declineCallGuest(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
    @Param('guestId') guestId: string,
  ) {
    return this.videoCallGuests.declineGuest(user.id, callId, guestId);
  }

  @Delete('calls/:callId/guests/:guestId')
  revokeCallGuest(
    @CurrentUser() user: AuthUser,
    @Param('callId') callId: string,
    @Param('guestId') guestId: string,
  ) {
    return this.videoCallGuests.revokeGuest(user.id, callId, guestId);
  }
}
