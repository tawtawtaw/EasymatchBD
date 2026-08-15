import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { PhotoVariantService } from './photo-variant.service';

@Global()
@Module({
  providers: [StorageService, PhotoVariantService],
  exports: [StorageService, PhotoVariantService],
})
export class StorageModule {}
