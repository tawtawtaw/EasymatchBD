-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "profileCode" TEXT;

-- Backfill existing profiles with unique 8-digit codes
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS rn
  FROM "Profile"
)
UPDATE "Profile" p
SET "profileCode" = (10000000 + n.rn)::text
FROM numbered n
WHERE p.id = n.id AND p."profileCode" IS NULL;

ALTER TABLE "Profile" ALTER COLUMN "profileCode" SET NOT NULL;

CREATE UNIQUE INDEX "Profile_profileCode_key" ON "Profile"("profileCode");
