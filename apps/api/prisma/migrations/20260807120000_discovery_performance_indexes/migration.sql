-- Discovery list queries: verified + gender filter, ordered by updatedAt
CREATE INDEX "Profile_isVerified_gender_updatedAt_idx" ON "Profile"("isVerified", "gender", "updatedAt");

-- Discovery fallback ordering when gender is implicit in the query plan
CREATE INDEX "Profile_isVerified_updatedAt_idx" ON "Profile"("isVerified", "updatedAt");

-- Unread message aggregation by connection + sender, excluding soft-deleted rows
CREATE INDEX "ConnectionMessage_connectionId_senderId_deletedAt_idx" ON "ConnectionMessage"("connectionId", "senderId", "deletedAt");
