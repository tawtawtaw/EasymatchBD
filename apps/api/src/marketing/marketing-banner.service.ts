import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  isMarketingBannerActive,
  isValidMarketingBannerHref,
  tariffCalendarDate,
  type MarketingBannerConfig,
  type PublicMarketingBanner,
} from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateMarketingBannerDto } from './dto/update-marketing-banner.dto';

const SINGLETON_ID = 'singleton';

@Injectable()
export class MarketingBannerService {
  private readonly logger = new Logger(MarketingBannerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPublicBanner(): Promise<{ banner: PublicMarketingBanner | null }> {
    try {
      const row = await this.getOrCreate();
      const config = this.toConfig(row);
      if (!isMarketingBannerActive(config)) {
        return { banner: null };
      }
      return {
        banner: {
          messageEn: config.messageEn.trim(),
          messageBn: config.messageBn,
          labelEn: config.labelEn,
          labelBn: config.labelBn,
          href: config.href,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Public marketing banner unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { banner: null };
    }
  }

  async getAdminConfig(): Promise<MarketingBannerConfig> {
    return this.toConfig(await this.getOrCreate());
  }

  async update(dto: UpdateMarketingBannerDto): Promise<MarketingBannerConfig> {
    const messageEn = dto.messageEn.trim();
    if (dto.enabled && !messageEn) {
      throw new BadRequestException(
        'English message is required when the banner is turned on',
      );
    }

    const href = this.normalizeHref(dto.href);
    const startsOn = tariffCalendarDate(dto.startsAt);
    const endsOn = tariffCalendarDate(dto.endsAt);
    if (startsOn && endsOn && startsOn > endsOn) {
      throw new BadRequestException(
        'Start date must be on or before the end date',
      );
    }

    const row = await this.prisma.marketingBanner.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        enabled: dto.enabled,
        messageEn,
        messageBn: dto.messageBn?.trim() || null,
        labelEn: dto.labelEn?.trim() || null,
        labelBn: dto.labelBn?.trim() || null,
        href,
        startsAt: startsOn ? new Date(`${startsOn}T00:00:00.000Z`) : null,
        endsAt: endsOn ? new Date(`${endsOn}T00:00:00.000Z`) : null,
      },
      update: {
        enabled: dto.enabled,
        messageEn,
        messageBn: dto.messageBn?.trim() || null,
        labelEn: dto.labelEn?.trim() || null,
        labelBn: dto.labelBn?.trim() || null,
        href,
        startsAt: startsOn ? new Date(`${startsOn}T00:00:00.000Z`) : null,
        endsAt: endsOn ? new Date(`${endsOn}T00:00:00.000Z`) : null,
      },
    });

    return this.toConfig(row);
  }

  private normalizeHref(raw: string | null | undefined): string | null {
    const value = raw?.trim() || null;
    if (!value) return null;
    if (!isValidMarketingBannerHref(value)) {
      throw new BadRequestException(
        'Link must be an internal path such as /membership',
      );
    }
    return value;
  }

  private async getOrCreate() {
    const existing = await this.prisma.marketingBanner.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (existing) return existing;

    try {
      return await this.prisma.marketingBanner.create({
        data: {
          id: SINGLETON_ID,
          enabled: false,
          messageEn: '',
        },
      });
    } catch (error) {
      const raced = await this.prisma.marketingBanner.findUnique({
        where: { id: SINGLETON_ID },
      });
      if (raced) return raced;
      this.logger.warn(
        `Could not seed marketing banner: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private toConfig(row: {
    enabled: boolean;
    messageEn: string;
    messageBn: string | null;
    labelEn: string | null;
    labelBn: string | null;
    href: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    updatedAt: Date;
  }): MarketingBannerConfig {
    return {
      enabled: row.enabled,
      messageEn: row.messageEn,
      messageBn: row.messageBn,
      labelEn: row.labelEn,
      labelBn: row.labelBn,
      href: row.href,
      startsAt: row.startsAt ? row.startsAt.toISOString() : null,
      endsAt: row.endsAt ? row.endsAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
