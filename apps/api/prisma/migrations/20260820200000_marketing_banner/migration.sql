-- Site-wide marketing announcement bar (admin-managed copy).
-- IF NOT EXISTS / ON CONFLICT keep this safe if boot schema-ensure already created the row.

CREATE TABLE IF NOT EXISTS "MarketingBanner" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "messageEn" TEXT NOT NULL DEFAULT '',
    "messageBn" TEXT,
    "labelEn" TEXT,
    "labelBn" TEXT,
    "href" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingBanner_pkey" PRIMARY KEY ("id")
);

INSERT INTO "MarketingBanner" ("id", "enabled", "messageEn", "updatedAt")
VALUES ('singleton', false, '', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
