-- Android APK releases published from Admin for the public website and in-app update check.

CREATE TABLE IF NOT EXISTS "AndroidAppRelease" (
    "id" TEXT NOT NULL,
    "versionCode" INTEGER NOT NULL,
    "versionName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AndroidAppRelease_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AndroidAppRelease_versionCode_key" ON "AndroidAppRelease"("versionCode");
CREATE INDEX IF NOT EXISTS "AndroidAppRelease_isCurrent_idx" ON "AndroidAppRelease"("isCurrent");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AndroidAppRelease_publishedById_fkey'
  ) THEN
    ALTER TABLE "AndroidAppRelease"
      ADD CONSTRAINT "AndroidAppRelease_publishedById_fkey"
      FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
