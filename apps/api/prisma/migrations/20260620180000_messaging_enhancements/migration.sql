-- CreateTable
CREATE TABLE "ConnectionParticipantState" (
    "connectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ConnectionParticipantState_pkey" PRIMARY KEY ("connectionId","userId")
);

-- CreateIndex
CREATE INDEX "ConnectionParticipantState_userId_idx" ON "ConnectionParticipantState"("userId");

-- AddForeignKey
ALTER TABLE "ConnectionParticipantState" ADD CONSTRAINT "ConnectionParticipantState_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionParticipantState" ADD CONSTRAINT "ConnectionParticipantState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
