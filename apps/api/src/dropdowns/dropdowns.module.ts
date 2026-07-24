import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { DropdownsService } from './dropdowns.service';

@Module({
  imports: [RedisModule],
  providers: [DropdownsService],
  exports: [DropdownsService],
})
export class DropdownsModule {}
