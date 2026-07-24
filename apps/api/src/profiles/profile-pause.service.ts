import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InterestStatus, VideoCallStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { invalidateDiscoveryListCache } from '../discovery/discovery-list-cache';
import { invalidateHomeBootstrapCache } from '../discovery/discovery-home-bootstrap-cache';

@Injectable()
export class ProfilePauseService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async getStatus(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { isPaused: true, pausedAt: true },
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return {
      isPaused: profile.isPaused,
      pausedAt: profile.pausedAt?.toISOString() ?? null,
    };
  }

  async pauseProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, isPaused: true },
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    if (profile.isPaused) {
      throw new BadRequestException('Your profile is already paused');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { userId },
        data: { isPaused: true, pausedAt: now },
      });

      await tx.interest.updateMany({
        where: {
          senderId: userId,
          status: InterestStatus.pending,
        },
        data: { status: InterestStatus.declined, respondedAt: now },
      });

      const connections = await tx.connection.findMany({
        where: {
          OR: [{ userLowId: userId }, { userHighId: userId }],
        },
        select: { id: true },
      });
      const connectionIds = connections.map((row) => row.id);
      if (connectionIds.length > 0) {
        await tx.videoCall.updateMany({
          where: {
            connectionId: { in: connectionIds },
            status: {
              in: [
                VideoCallStatus.scheduled,
                VideoCallStatus.ringing,
                VideoCallStatus.active,
              ],
            },
          },
          data: {
            status: VideoCallStatus.cancelled,
            endedAt: now,
          },
        });
      }
    });

    this.afterPauseChange(userId);
    return { isPaused: true, pausedAt: now.toISOString() };
  }

  async reactivateProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { isPaused: true },
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    if (!profile.isPaused) {
      throw new BadRequestException('Your profile is not paused');
    }

    await this.prisma.profile.update({
      where: { userId },
      data: { isPaused: false, pausedAt: null },
    });

    this.afterPauseChange(userId);
    return { isPaused: false, pausedAt: null };
  }

  async assertCanUseDiscovery(userId: string) {
    if (await this.isUserPaused(userId)) {
      throw new BadRequestException(
        'Reactivate your profile to browse discovery or send interests',
      );
    }
  }

  async assertCanSendConnectionActions(userId: string) {
    if (await this.isUserPaused(userId)) {
      throw new BadRequestException(
        'Reactivate your profile to use this feature',
      );
    }
  }

  async isUserPaused(userId: string): Promise<boolean> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { isPaused: true },
    });
    return profile?.isPaused ?? false;
  }

  private afterPauseChange(userId: string) {
    this.authService.invalidateSessionCache(userId);
    invalidateDiscoveryListCache(userId);
    invalidateHomeBootstrapCache(userId);
  }
}
