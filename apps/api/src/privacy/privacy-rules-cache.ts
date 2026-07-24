import type { PrivacyFieldsService } from './privacy-fields.service';
import type { PrivacyRule } from './profile-privacy-filter';

const PRIVACY_RULES_CACHE_TTL_MS = 120_000;

let privacyRulesCache: { expiresAt: number; value: PrivacyRule[] } | null =
  null;
let privacyRulesInflight: Promise<PrivacyRule[]> | null = null;

export function invalidatePrivacyRulesCache() {
  privacyRulesCache = null;
  privacyRulesInflight = null;
}

export async function getCachedPrivacyRules(
  privacyFields: PrivacyFieldsService,
): Promise<PrivacyRule[]> {
  if (privacyRulesCache && privacyRulesCache.expiresAt > Date.now()) {
    return privacyRulesCache.value;
  }

  if (privacyRulesInflight) {
    return privacyRulesInflight;
  }

  privacyRulesInflight = privacyFields.listAll().then((rows) => {
    const value = rows.map((row) => ({
      fieldKey: row.fieldKey,
      isShareable: row.isShareable,
      minPrivacyLevel: row.minPrivacyLevel,
    }));
    privacyRulesCache = {
      expiresAt: Date.now() + PRIVACY_RULES_CACHE_TTL_MS,
      value,
    };
    return value;
  }).finally(() => {
    privacyRulesInflight = null;
  });

  return privacyRulesInflight;
}
