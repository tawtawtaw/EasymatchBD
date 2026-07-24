import { AdminComplaintDetailPanel } from "@/components/AdminComplaintDetailPanel";

export default async function AdminComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminComplaintDetailPanel complaintId={id} />;
}
