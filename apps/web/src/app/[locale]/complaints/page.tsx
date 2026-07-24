import { Suspense } from "react";
import { MemberComplaintsPanel } from "@/components/MemberComplaintsPanel";

export default function ComplaintsPage() {
  return (
    <Suspense fallback={null}>
      <MemberComplaintsPanel />
    </Suspense>
  );
}
