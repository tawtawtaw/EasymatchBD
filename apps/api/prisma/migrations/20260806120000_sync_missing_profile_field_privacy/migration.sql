-- Ensure newer biodata fields exist in ProfileFieldPrivacy (idempotent).
-- Runtime sync in PrivacyFieldsService also adds missing keys; this migration
-- covers deployments before the API process restarts.

INSERT INTO "ProfileFieldPrivacy" ("fieldKey", "section", "isShareable", "minPrivacyLevel", "sortOrder", "createdAt", "updatedAt")
SELECT v.field_key, v.section, v.is_shareable, v.min_level, COALESCE(m.max_sort, -1) + v.sort_offset, NOW(), NOW()
FROM (
  VALUES
    ('smoking_habit', 'personal', true, 2, 1),
    ('children_count', 'personal', true, 3, 2),
    ('expected_marriage_timeline', 'marital', true, 2, 3),
    ('dowry_expectation', 'marital', true, 3, 4),
    ('wedding_ceremony_preference', 'marital', true, 2, 5),
    ('expected_parenthood_timeline', 'marital', true, 2, 6),
    ('living_arrangements', 'marital', true, 3, 7),
    ('living_arrangements_other', 'marital', true, 3, 8),
    ('expected_kabin_amount_min_bdt', 'marital', true, 3, 9),
    ('expected_kabin_amount_max_bdt', 'marital', true, 3, 10),
    ('partner_religion', 'partner', false, 0, 11),
    ('current_country', 'personal', true, 0, 12),
    ('permanent_country', 'personal', true, 2, 13)
) AS v(field_key, section, is_shareable, min_level, sort_offset)
CROSS JOIN (
  SELECT MAX("sortOrder") AS max_sort FROM "ProfileFieldPrivacy"
) AS m
WHERE NOT EXISTS (
  SELECT 1 FROM "ProfileFieldPrivacy" p WHERE p."fieldKey" = v.field_key
);

-- If other partner preference fields are shared publicly, align partner religion too.
UPDATE "ProfileFieldPrivacy" AS target
SET
  "isShareable" = ref."isShareable",
  "minPrivacyLevel" = ref."minPrivacyLevel",
  "updatedAt" = NOW()
FROM "ProfileFieldPrivacy" AS ref
WHERE target."fieldKey" = 'partner_religion'
  AND ref."fieldKey" = 'partner_age_range'
  AND ref."isShareable" = true
  AND target."isShareable" = false;
