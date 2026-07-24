import { ConsultantComplaintDetailPanel } from "@/components/ConsultantComplaintDetailPanel";

export default async function ConsultantComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConsultantComplaintDetailPanel complaintId={id} />;
}
