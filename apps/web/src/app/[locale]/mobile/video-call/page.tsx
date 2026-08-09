"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import "@/app/mobile-call.css";
import { markMobileAppSession } from "@/lib/mobile-app-session";
import { VideoCallRoom } from "@/components/VideoCallRoom";
import { NativeCallCommandListener } from "@/components/NativeCallCommandListener";

export default function MobileVideoCallPage() {
  const searchParams = useSearchParams();
  const tc = useTranslations("common");
  const t = useTranslations("videoCalls");
  const mounted = useMounted();
  const authToken = useAuthToken();

  const connectionId = searchParams.get("connectionId");
  const callId = searchParams.get("callId");
  const fromMobile = searchParams.get("from") === "mobile";
  const autoJoin = searchParams.get("autoJoin") === "1";
  const memberName =
    searchParams.get("memberName")?.trim() || t("unknownMember");

  useEffect(() => {
    if (fromMobile) {
      markMobileAppSession();
      document.documentElement.dataset.easymatchNativeCall = "1";
    }
    return () => {
      delete document.documentElement.dataset.easymatchNativeCall;
    };
  }, [fromMobile]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <p className="text-zinc-300">{tc("loading")}</p>
      </div>
    );
  }

  if (!authToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <p className="text-center text-zinc-300">{t("signInRequired")}</p>
      </div>
    );
  }

  if (!connectionId || !callId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <p className="text-center text-zinc-300">{t("missingCallId")}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex min-h-0 flex-col bg-zinc-950">
      <NativeCallCommandListener />
      <VideoCallRoom
        connectionId={connectionId}
        callId={callId}
        memberName={memberName}
        embeddedMobile
        nativeShell
        autoJoin={autoJoin}
      />
    </div>
  );
}
