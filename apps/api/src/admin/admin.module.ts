import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsultantModule } from '../consultant/consultant.module';
import { DropdownsModule } from '../dropdowns/dropdowns.module';
import { LegalModule } from '../legal/legal.module';
import { MarketingModule } from '../marketing/marketing.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { StorageModule } from '../storage/storage.module';
import { VerificationModule } from '../verification/verification.module';
import { AdminConsultantCasesController } from './admin-consultant-cases.controller';
import { AdminDropdownsController } from './admin-dropdowns.controller';
import { AdminLegalController } from './admin-legal.controller';
import { AdminMarketingBannerController } from './admin-marketing-banner.controller';
import { AdminPrivacyFieldsController } from './admin-privacy-fields.controller';
import { AdminProfileDeletionsController } from './admin-profile-deletions.controller';
import { AdminProfileDeletionsService } from './admin-profile-deletions.service';
import { AdminProfilesController } from './admin-profiles.controller';
import { AdminProfilesService } from './admin-profiles.service';
import { AdminBiodataCsvExportService } from './admin-biodata-csv-export.service';
import { AdminInterestsController } from './admin-interests.controller';
import { AdminInterestsService } from './admin-interests.service';

@Module({
  imports: [AuthModule, ConsultantModule, DropdownsModule, PrivacyModule, LegalModule, MarketingModule, VerificationModule, StorageModule],
  controllers: [
    AdminConsultantCasesController,
    AdminDropdownsController,
    AdminPrivacyFieldsController,
    AdminLegalController,
    AdminMarketingBannerController,
    AdminProfilesController,
    AdminInterestsController,
    AdminProfileDeletionsController,
  ],
  providers: [
    AdminProfilesService,
    AdminBiodataCsvExportService,
    AdminInterestsService,
    AdminProfileDeletionsService,
  ],
})
export class AdminModule {}
