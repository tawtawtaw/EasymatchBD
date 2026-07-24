import { Controller, Get } from '@nestjs/common';
import { PRIVACY_LEVEL_LABELS } from '@easymatch/shared';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getInfo() {
    return {
      ...this.appService.getInfo(),
      privacyLevels: PRIVACY_LEVEL_LABELS,
    };
  }
}
