import { Injectable, Logger } from '@nestjs/common';
import { isStaffRole } from '@easymatch/shared';
import { SubscriptionAccessService } from '../subscriptions/subscription-access.service';
import { DiscoveryService } from './discovery.service';
import { MessagesService } from './messages.service';
import { VideoCallsService } from './video-calls.service';

@Injectable()
export class MemberCacheWarmupService {
  private readonly logger = new Logger(MemberCacheWarmupService.name);

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly messages: MessagesService,
    private readonly videoCalls: VideoCallsService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  warm(userId: string, role: string) {
    if (isStaffRole(role)) {
      return;
    }

    void Promise.allSettled([
      this.discovery.getHomeBootstrap(userId),
      this.subscriptionAccess.isPaidMember(userId).then((isPaid) =>
        isPaid ? this.messages.getUnreadCount(userId) : { unreadCount: 0 },
      ),
      this.videoCalls.listCallAlerts(userId),
    ]).then((results) => {
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length > 0) {
        this.logger.debug(
          `Post-login cache warmup had ${failed.length} failure(s) for user ${userId}`,
        );
      }
    });
  }
}
