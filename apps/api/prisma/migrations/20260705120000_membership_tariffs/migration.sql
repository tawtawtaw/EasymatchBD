-- CreateTable
CREATE TABLE "MembershipTariff" (
    "id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelBn" TEXT,
    "priceBdt" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "descriptionEn" TEXT,
    "descriptionBn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipTariff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipTariff_plan_key" ON "MembershipTariff"("plan");

-- Seed default paid plan tariffs (admin can edit in portal)
INSERT INTO "MembershipTariff" (
    "id",
    "plan",
    "labelEn",
    "labelBn",
    "priceBdt",
    "currency",
    "durationDays",
    "isActive",
    "sortOrder",
    "descriptionEn",
    "descriptionBn",
    "updatedAt"
) VALUES
(
    'tariff_gold_default',
    'gold',
    'Gold membership',
    'গোল্ড সদস্যপদ',
    999.00,
    'BDT',
    30,
    true,
    1,
    'Unlock interest, messaging, video calls, and biodata PDF for 30 days.',
    '৩০ দিনের জন্য ইন্টারেস্ট, মেসেজ, ভিডিও কল ও biodata PDF।',
    CURRENT_TIMESTAMP
),
(
    'tariff_platinum_default',
    'platinum',
    'Platinum membership',
    'প্লাটিনাম সদস্যপদ',
    1999.00,
    'BDT',
    30,
    true,
    2,
    'Full paid access for 30 days (same features as Gold; pricing tier for future perks).',
    '৩০ দিনের পূর্ণ paid access (Gold-এর মতো; ভবিষ্যতে আলাদা সুবিধার জন্য tier)।',
    CURRENT_TIMESTAMP
);
