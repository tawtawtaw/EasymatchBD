import { Module } from '@nestjs/common';
import { LegalModule } from '../legal/legal.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { StorageModule } from '../storage/storage.module';
import { ConnectionsService } from './connections.service';
import { DiscoveryController } from './discovery.controller';
import { PublicBrowseController } from './public-browse.controller';
import { VideoCallGuestController } from './video-call-guest.controller';
import { DiscoveryService } from './discovery.service';
import { PublicBrowseService } from './public-browse.service';
import { MessagesService } from './messages.service';
import { VideoCallsService } from './video-calls.service';
import { VideoCallGuestsService } from './video-call-guests.service';
import { LiveKitService } from './livekit.service';
import { ComparisonService } from './comparison.service';
import { SavedProfilesService } from './saved-profiles.service';
import { MemberAlertsSummaryService } from './member-alerts-summary.service';
import { MemberCacheWarmupService } from './member-cache-warmup.service';

@Module({
  imports: [PrivacyModule, StorageModule, ProfilesModule, LegalModule],
  controllers: [DiscoveryController, PublicBrowseController, VideoCallGuestController],
  providers: [
    DiscoveryService,
    PublicBrowseService,
    ConnectionsService,
    MessagesService,
    VideoCallsService,
    VideoCallGuestsService,
    LiveKitService,
    SavedProfilesService,
    ComparisonService,
    MemberAlertsSummaryService,
    MemberCacheWarmupService,
  ],
  exports: [MemberCacheWarmupService],
})
export class DiscoveryModule {}
