import { Controller, Get, Query } from '@nestjs/common';
import { LegalService } from './legal.service';

@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('terms')
  getTerms(@Query('locale') locale?: string) {
    return this.legalService.getPublishedTerms(locale === 'bn' ? 'bn' : 'en');
  }
}
