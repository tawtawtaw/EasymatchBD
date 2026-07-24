-- CreateEnum
CREATE TYPE "ConsultantPaymentStatus" AS ENUM ('pending', 'validated', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ConsultantEngagementStatus" AS ENUM ('queued', 'assigned', 'in_progress', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "ConsultantPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "serviceType" "ConsultantServiceType" NOT NULL,
    "serviceLabelEn" TEXT NOT NULL,
    "tranId" TEXT NOT NULL,
    "amountBdt" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "ConsultantPaymentStatus" NOT NULL DEFAULT 'pending',
    "valId" TEXT,
    "sessionKey" TEXT,
    "gatewayUrl" TEXT,
    "sslStatus" TEXT,
    "sslResponse" JSONB,
    "validatedAt" TIMESTAMP(3),
    "memberNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantEngagement" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "serviceType" "ConsultantServiceType" NOT NULL,
    "serviceLabelEn" TEXT NOT NULL,
    "amountBdt" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "requestedById" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "ConsultantEngagementStatus" NOT NULL DEFAULT 'queued',
    "assignedConsultantId" TEXT,
    "memberNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantPayment_tranId_key" ON "ConsultantPayment"("tranId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantPayment_valId_key" ON "ConsultantPayment"("valId");

-- CreateIndex
CREATE INDEX "ConsultantPayment_userId_createdAt_idx" ON "ConsultantPayment"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ConsultantPayment_connectionId_idx" ON "ConsultantPayment"("connectionId");

-- CreateIndex
CREATE INDEX "ConsultantPayment_status_idx" ON "ConsultantPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantEngagement_paymentId_key" ON "ConsultantEngagement"("paymentId");

-- CreateIndex
CREATE INDEX "ConsultantEngagement_connectionId_createdAt_idx" ON "ConsultantEngagement"("connectionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ConsultantEngagement_status_idx" ON "ConsultantEngagement"("status");

-- CreateIndex
CREATE INDEX "ConsultantEngagement_assignedConsultantId_idx" ON "ConsultantEngagement"("assignedConsultantId");

-- AddForeignKey
ALTER TABLE "ConsultantPayment" ADD CONSTRAINT "ConsultantPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantPayment" ADD CONSTRAINT "ConsultantPayment_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantEngagement" ADD CONSTRAINT "ConsultantEngagement_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantEngagement" ADD CONSTRAINT "ConsultantEngagement_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantEngagement" ADD CONSTRAINT "ConsultantEngagement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "ConsultantPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantEngagement" ADD CONSTRAINT "ConsultantEngagement_assignedConsultantId_fkey" FOREIGN KEY ("assignedConsultantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
