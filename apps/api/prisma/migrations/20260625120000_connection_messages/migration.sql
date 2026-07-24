-- CreateEnum
CREATE TYPE "ConnectionMessageType" AS ENUM ('text', 'image', 'file');

-- CreateTable
CREATE TABLE "ConnectionMessage" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "messageType" "ConnectionMessageType" NOT NULL DEFAULT 'text',
    "body" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "attachmentStorageKey" TEXT,
    "attachmentMimeType" TEXT,
    "attachmentFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectionMessage_connectionId_createdAt_idx" ON "ConnectionMessage"("connectionId", "createdAt");

-- CreateIndex
CREATE INDEX "ConnectionMessage_senderId_idx" ON "ConnectionMessage"("senderId");

-- AddForeignKey
ALTER TABLE "ConnectionMessage" ADD CONSTRAINT "ConnectionMessage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionMessage" ADD CONSTRAINT "ConnectionMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
