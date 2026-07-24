"use client";

import { useSearchParams } from "next/navigation";
import { LiveKitVideoCallRoom } from "@/components/LiveKitVideoCallRoom";

export default function ConsultantVideoCallPage() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? "";
  const token = searchParams.get("token") ?? "";

  if (!url || !token) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-zinc-600">
        Invalid video session. Return to the case and try joining again.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <LiveKitVideoCallRoom
        serverUrl={url}
        token={token}
        onDisconnected={() => window.close()}
      />
    </main>
  );
}
