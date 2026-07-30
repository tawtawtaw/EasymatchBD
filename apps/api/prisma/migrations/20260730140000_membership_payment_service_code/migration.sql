-- Store SSLCommerz / catalogue service package code on each membership payment.
ALTER TABLE "MembershipPayment" ADD COLUMN "serviceCode" TEXT;

CREATE INDEX "MembershipPayment_serviceCode_idx" ON "MembershipPayment"("serviceCode");
