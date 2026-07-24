-- AlterTable
ALTER TABLE "ConsultantCaseMessage" ADD COLUMN "recipientId" TEXT;

-- CreateIndex
CREATE INDEX "ConsultantCaseMessage_recipientId_idx" ON "ConsultantCaseMessage"("recipientId");

-- AddForeignKey
ALTER TABLE "ConsultantCaseMessage" ADD CONSTRAINT "ConsultantCaseMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
