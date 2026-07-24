-- Migrate legacy partner hijab prefs stored with hijab_practice slugs.
UPDATE "PartnerPreference"
SET "hijabPreference" = CASE "hijabPreference"
  WHEN 'wear_regularly' THEN 'regular_hijabi_partner'
  WHEN 'wear_occasionally' THEN 'irregular_hijabi_ok'
  WHEN 'never_wear' THEN 'no_hijab_needed'
  WHEN 'intend_to_wear' THEN 'intention_to_wear_hijab'
  ELSE "hijabPreference"
END
WHERE "hijabPreference" IN (
  'wear_regularly',
  'wear_occasionally',
  'never_wear',
  'intend_to_wear'
);
