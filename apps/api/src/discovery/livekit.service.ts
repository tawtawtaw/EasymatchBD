import { Injectable, Logger } from '@nestjs/common';
import { VIDEO_CALL_EMPTY_ROOM_GRACE_MS } from '@easymatch/shared';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient, TwirpError } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);
  private roomClient: RoomServiceClient | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.url && this.apiKey && this.apiSecret);
  }

  get url(): string | undefined {
    return this.config.get<string>('LIVEKIT_URL');
  }

  roomName(callId: string): string {
    return `easymatch-call-${callId}`;
  }

  async createParticipantToken(options: {
    callId: string;
    identity: string;
    name: string;
    canPublish?: boolean;
    canSubscribe?: boolean;
    ttlSeconds?: number;
  }): Promise<string> {
    const apiKey = this.apiKey;
    const apiSecret = this.apiSecret;
    const url = this.url;
    if (!apiKey || !apiSecret || !url) {
      throw new Error('LiveKit is not configured');
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: options.identity,
      name: options.name,
      ttl: options.ttlSeconds ?? 3720,
    });

    at.addGrant({
      roomJoin: true,
      room: this.roomName(options.callId),
      canPublish: options.canPublish ?? true,
      canSubscribe: options.canSubscribe ?? true,
    });

    return await at.toJwt();
  }

  async ensureCallRoom(callId: string): Promise<void> {
    const client = this.roomService();
    if (!client) return;

    const emptyTimeout = Math.ceil(VIDEO_CALL_EMPTY_ROOM_GRACE_MS / 1000);
    try {
      await client.createRoom({
        name: this.roomName(callId),
        emptyTimeout,
        departureTimeout: emptyTimeout,
        maxParticipants: 12,
      });
    } catch (err) {
      if (isLiveKitNotFound(err) || isLiveKitAlreadyExists(err)) {
        return;
      }
      this.logger.warn(
        `Could not ensure LiveKit room for call ${callId}: ${errorMessage(err)}`,
      );
    }
  }

  /** Room names that still exist on LiveKit. `null` if LiveKit could not be queried. */
  async listExistingCallRoomNames(): Promise<Set<string> | null> {
    const client = this.roomService();
    if (!client) return null;

    try {
      const rooms = await client.listRooms();
      return new Set(rooms.map((room) => room.name));
    } catch (err) {
      this.logger.warn(
        `Could not list LiveKit rooms: ${errorMessage(err)}`,
      );
      return null;
    }
  }

  async deleteRoom(callId: string): Promise<void> {
    const client = this.roomService();
    if (!client) return;

    try {
      await client.deleteRoom(this.roomName(callId));
    } catch (err) {
      if (isLiveKitNotFound(err)) return;
      this.logger.warn(
        `Could not delete LiveKit room for call ${callId}: ${errorMessage(err)}`,
      );
    }
  }

  private roomService(): RoomServiceClient | null {
    if (!this.isConfigured()) return null;
    if (!this.roomClient) {
      const host = this.httpUrl;
      const apiKey = this.apiKey;
      const apiSecret = this.apiSecret;
      if (!host || !apiKey || !apiSecret) return null;
      this.roomClient = new RoomServiceClient(host, apiKey, apiSecret);
    }
    return this.roomClient;
  }

  private get httpUrl(): string | undefined {
    const url = this.url;
    if (!url) return undefined;
    return url.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
  }

  private get apiKey(): string | undefined {
    return this.config.get<string>('LIVEKIT_API_KEY');
  }

  private get apiSecret(): string | undefined {
    return this.config.get<string>('LIVEKIT_API_SECRET');
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isLiveKitNotFound(err: unknown): boolean {
  if (err instanceof TwirpError) {
    return err.status === 404 || err.code === 'not_found';
  }
  const message = errorMessage(err);
  return /not found|does not exist/i.test(message);
}

function isLiveKitAlreadyExists(err: unknown): boolean {
  if (err instanceof TwirpError) {
    return err.status === 409 || err.code === 'already_exists';
  }
  return /already exists/i.test(errorMessage(err));
}
