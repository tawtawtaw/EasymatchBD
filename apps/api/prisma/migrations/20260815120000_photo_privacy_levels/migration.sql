-- Profile photo unlocks at privacy level 1 (Basic Mutual Interest).
-- Full gallery unlocks at privacy level 2 (Profile Compatibility).
-- Public browse (level 0) continues to strip photos regardless of these rules.
UPDATE "ProfileFieldPrivacy"
SET
  "minPrivacyLevel" = 1,
  "updatedAt" = NOW()
WHERE "fieldKey" = 'primary_photo';

UPDATE "ProfileFieldPrivacy"
SET
  "minPrivacyLevel" = 2,
  "updatedAt" = NOW()
WHERE "fieldKey" = 'gallery_photos';
