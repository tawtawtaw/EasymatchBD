"use client";

import dynamic from "next/dynamic";

const IncomingCallOverlay = dynamic(
  () =>
    import("@/components/IncomingCallOverlay").then((mod) => ({
      default: mod.IncomingCallOverlay,
    })),
  { ssr: false },
);

const GlobalLiveKitCallHost = dynamic(
  () =>
    import("@/components/GlobalLiveKitCallHost").then((mod) => ({
      default: mod.GlobalLiveKitCallHost,
    })),
  { ssr: false },
);

/** LiveKit + incoming call UI — separate chunk so locale layout loads faster over ngrok. */
export function CallRuntimeUi() {
  return (
    <>
      <IncomingCallOverlay />
      <GlobalLiveKitCallHost />
    </>
  );
}
