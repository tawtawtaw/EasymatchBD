-- CreateEnum
CREATE TYPE "MembershipPaymentStatus" AS ENUM ('pending', 'validated', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "MembershipPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "tranId" TEXT NOT NULL,
    "amountBdt" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "durationDays" INTEGER NOT NULL,
    "status" "MembershipPaymentStatus" NOT NULL DEFAULT 'pending',
    "valId" TEXT,
    "sessionKey" TEXT,
    "gatewayUrl" TEXT,
    "sslStatus" TEXT,
    "sslResponse" JSONB,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPayment_tranId_key" ON "MembershipPayment"("tranId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPayment_valId_key" ON "MembershipPayment"("valId");

-- CreateIndex
CREATE INDEX "MembershipPayment_userId_createdAt_idx" ON "MembershipPayment"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MembershipPayment_status_idx" ON "MembershipPayment"("status");

-- AddForeignKey
ALTER TABLE "MembershipPayment" ADD CONSTRAINT "MembershipPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
