import { MemberComplaintDetailPanel } from "@/components/MemberComplaintDetailPanel";

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberComplaintDetailPanel complaintId={id} />;
}
