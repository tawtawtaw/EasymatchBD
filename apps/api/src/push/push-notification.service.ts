import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MEMBER_INCOMING_PUSH,
  PUSH_CHANNEL_ACTIVITY,
  PUSH_CHANNEL_CALLS,
  PUSH_CHANNEL_MESSAGES,
  PUSH_CHANNEL_VERIFICATION,
} from './push-channels';

export type PushNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'default' | 'high';
  channelId?: string;
};

export {
  PUSH_CHANNEL_ACTIVITY,
  PUSH_CHANNEL_CALLS,
  PUSH_CHANNEL_MESSAGES,
  PUSH_CHANNEL_VERIFICATION,
  MEMBER_INCOMING_PUSH,
};

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerToken(
    userId: string,
    token: string,
    platform?: string | null,
  ) {
    const trimmed = token.trim();
    if (!trimmed) {
      return { ok: false };
    }

    await this.prisma.userPushToken.upsert({
      where: { token: trimmed },
      create: {
        userId,
        token: trimmed,
        platform: platform?.trim() || null,
      },
      update: {
        userId,
        platform: platform?.trim() || null,
      },
    });

    this.logger.log(
      `Registered push token for user ${userId} (${platform ?? 'unknown'})`,
    );

    return { ok: true };
  }

  async removeToken(userId: string, token: string) {
    const trimmed = token.trim();
    if (!trimmed) {
      return { ok: false };
    }

    await this.prisma.userPushToken.deleteMany({
      where: { userId, token: trimmed },
    });

    return { ok: true };
  }

  countTokensForUser(userId: string) {
    return this.prisma.userPushToken.count({ where: { userId } });
  }

  async sendToUser(userId: string, notification: PushNotificationPayload) {
    const tokens = await this.prisma.userPushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No push tokens registered for user ${userId}`);
      return;
    }

    const messages = tokens.map((entry) => ({
      to: entry.token,
      sound: 'default' as const,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      priority: notification.priority ?? 'default',
      ...(notification.channelId ? { channelId: notification.channelId } : {}),
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(
          `Expo push failed for user ${userId}: ${response.status} ${text}`,
        );
        return;
      }

      const result = (await response.json()) as {
        data?: Array<{ status?: string; details?: { error?: string } }>;
      };

      const invalidTokens: string[] = [];
      for (let i = 0; i < (result.data?.length ?? 0); i += 1) {
        const item = result.data?.[i];
        if (
          item?.status === 'error' &&
          item.details?.error === 'DeviceNotRegistered'
        ) {
          const token = tokens[i]?.token;
          if (token) invalidTokens.push(token);
        }
      }

      if (invalidTokens.length > 0) {
        await this.prisma.userPushToken.deleteMany({
          where: { token: { in: invalidTokens } },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Expo push request failed for user ${userId}: ${String(error)}`,
      );
    }
  }
}
