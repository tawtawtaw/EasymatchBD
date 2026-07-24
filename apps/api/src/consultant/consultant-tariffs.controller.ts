import { Controller, Get } from '@nestjs/common';
import { ConsultantTariffsService } from './consultant-tariffs.service';

@Controller('consultant-tariffs')
export class ConsultantTariffsController {
  constructor(private readonly tariffs: ConsultantTariffsService) {}

  @Get()
  listActiveTariffs() {
    return this.tariffs.listActive();
  }
}
