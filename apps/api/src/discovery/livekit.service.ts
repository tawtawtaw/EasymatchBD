import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
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
      ttl: '2h',
    });

    at.addGrant({
      roomJoin: true,
      room: this.roomName(options.callId),
      canPublish: options.canPublish ?? true,
      canSubscribe: options.canSubscribe ?? true,
    });

    return await at.toJwt();
  }

  private get apiKey(): string | undefined {
    return this.config.get<string>('LIVEKIT_API_KEY');
  }

  private get apiSecret(): string | undefined {
    return this.config.get<string>('LIVEKIT_API_SECRET');
  }
}
