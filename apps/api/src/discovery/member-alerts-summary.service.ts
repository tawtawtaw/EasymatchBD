import { Injectable } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { MessagesService } from './messages.service';
import { VideoCallsService } from './video-calls.service';
import {
  invalidateAlertsSummaryCache,
  registerAlertsSummaryCacheInvalidator,
} from './alerts-summary-cache';

/** Must exceed web (20s) and mobile (8s) poll intervals. */
const CACHE_TTL_MS = 30_000;
const STALE_TTL_MS = 120_000;

export type EndedConnectionAlert = {
  connectionId: string;
  endedAt: string;
  reconnectAvailableAt: string | null;
  member: {
    profileCode: string | null;
    fullName: string | null;
  };
};

export type MemberAlertsSummaryResponse = {
  unreadMessages: number;
  incomingInterests: number;
  outgoingInterests: number;
  connections: number;
  incomingCalls: number;
  incomingCallAlert: Awaited<
    ReturnType<VideoCallsService['listCallAlerts']>
  >[number] | null;
  callAlerts: Awaited<ReturnType<VideoCallsService['listCallAlerts']>>;
  endedConnectionAlerts: EndedConnectionAlert[];
};

@Injectable()
export class MemberAlertsSummaryService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: MemberAlertsSummaryResponse }
  >();
  private readonly inflight = new Map<
    string,
    Promise<MemberAlertsSummaryResponse>
  >();

  constructor(
    private readonly messages: MessagesService,
    private readonly connections: ConnectionsService,
    private readonly videoCalls: VideoCallsService,
  ) {
    registerAlertsSummaryCacheInvalidator((userId) => {
      this.cache.delete(userId);
      this.inflight.delete(userId);
    });
  }

  invalidate(userId: string) {
    invalidateAlertsSummaryCache(userId);
  }

  async getSummary(userId: string): Promise<MemberAlertsSummaryResponse> {
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (cached && cached.expiresAt + STALE_TTL_MS > Date.now()) {
      void this.refreshSummary(userId);
      return cached.value;
    }

    return this.loadSummary(userId);
  }

  private refreshSummary(userId: string) {
    if (this.inflight.has(userId)) {
      return;
    }
    void this.loadSummary(userId);
  }

  private loadSummary(userId: string): Promise<MemberAlertsSummaryResponse> {
    const inflight = this.inflight.get(userId);
    if (inflight) {
      return inflight;
    }

    const request = this.fetchSummary(userId).finally(() => {
      this.inflight.delete(userId);
    });
    this.inflight.set(userId, request);
    return request;
  }

  private async fetchSummary(
    userId: string,
  ): Promise<MemberAlertsSummaryResponse> {
    const [unread, stats, callAlerts, endedConnectionAlerts] = await Promise.all([
      this.messages.getUnreadCount(userId).catch(() => ({ unreadCount: 0 })),
      this.connections.getMemberDiscoveryStats(userId),
      this.videoCalls
        .listCallAlerts(userId)
        .catch(
          (): Awaited<ReturnType<VideoCallsService['listCallAlerts']>> => [],
        ),
      this.connections.listEndedConnectionAlerts(userId).catch(
        (): EndedConnectionAlert[] => [],
      ),
    ]);

    const incomingCallAlerts = callAlerts.filter(
      (alert) => alert.kind === 'incoming',
    );

    const value: MemberAlertsSummaryResponse = {
      unreadMessages: unread.unreadCount,
      incomingInterests: stats.incoming,
      outgoingInterests: stats.outgoing,
      connections: stats.connections,
      incomingCalls: incomingCallAlerts.length,
      incomingCallAlert: incomingCallAlerts[0] ?? null,
      callAlerts,
      endedConnectionAlerts,
    };

    this.cache.set(userId, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    });

    return value;
  }
}
