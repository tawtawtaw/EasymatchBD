import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  clampPublicBrowseLimit,
  PUBLIC_BROWSE_DEFAULT_LIMIT,
} from '@easymatch/shared';
import { parseDiscoveryFilters } from './discovery-filters';
import { PublicBrowseService } from './public-browse.service';

@Controller('public')
export class PublicBrowseController {
  constructor(private readonly publicBrowse: PublicBrowseService) {}

  @Get('profiles')
  listProfiles(
    @Req() req: Request,
    @Query() query: Record<string, string | undefined>,
  ) {
    this.publicBrowse.assertRateLimit(this.clientKey(req));
    const { limit, skipTotal, ...filterQuery } = query;
    return this.publicBrowse.listProfiles(
      parseDiscoveryFilters(filterQuery),
      clampPublicBrowseLimit(
        limit ? Number(limit) : PUBLIC_BROWSE_DEFAULT_LIMIT,
      ),
      { skipTotal: skipTotal === '1' || skipTotal === 'true' },
    );
  }

  @Get('stats')
  getStats(@Req() req: Request) {
    this.publicBrowse.assertRateLimit(this.clientKey(req));
    return this.publicBrowse.getPlatformStats();
  }

  @Get('profiles/:profileCode')
  getProfile(@Req() req: Request, @Param('profileCode') profileCode: string) {
    this.publicBrowse.assertRateLimit(this.clientKey(req));
    return this.publicBrowse.getProfile(profileCode);
  }

  private clientKey(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0]?.trim() ?? 'unknown';
    }
    return req.ip ?? 'unknown';
  }
}
