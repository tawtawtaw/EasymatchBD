import { Controller, Get } from '@nestjs/common';
import { MembershipTariffsService } from './membership-tariffs.service';

@Controller('membership/tariffs')
export class MembershipTariffsController {
  constructor(private readonly tariffs: MembershipTariffsService) {}

  @Get()
  listActiveTariffs() {
    return this.tariffs.listActive();
  }
}
