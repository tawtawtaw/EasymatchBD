-- Ten public tables created after 20260722120000_supabase_rls_public_schema.
-- Idempotent: safe if 20260804120000 already ran.

ALTER TABLE "VideoCallGuest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "VideoCallGuest" FROM anon, authenticated;

ALTER TABLE "MembershipTariff" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "MembershipTariff" FROM anon, authenticated;

ALTER TABLE "MembershipPayment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "MembershipPayment" FROM anon, authenticated;

ALTER TABLE "ConsultantTariff" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConsultantTariff" FROM anon, authenticated;

ALTER TABLE "ConsultantPayment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConsultantPayment" FROM anon, authenticated;

ALTER TABLE "ConsultantEngagement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConsultantEngagement" FROM anon, authenticated;

ALTER TABLE "ConsultantMeeting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConsultantMeeting" FROM anon, authenticated;

ALTER TABLE "ConsultantCaseMessage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConsultantCaseMessage" FROM anon, authenticated;

ALTER TABLE "ConsultantCaseDiaryEntry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConsultantCaseDiaryEntry" FROM anon, authenticated;

ALTER TABLE "MemberComplaint" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "MemberComplaint" FROM anon, authenticated;

-- Added shortly after the initial post-baseline batch
ALTER TABLE "MemberComplaintMessage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "MemberComplaintMessage" FROM anon, authenticated;

ALTER TABLE "MemberComplaintDiaryEntry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "MemberComplaintDiaryEntry" FROM anon, authenticated;

ALTER TABLE "StaffActivityLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StaffActivityLog" FROM anon, authenticated;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
