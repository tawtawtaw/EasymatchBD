"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getSession } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import { useRequireMember } from "@/hooks/use-require-member";
import { listConnectionMessages } from "@/lib/messages";
import { listMyConnections } from "@/lib/discovery";
import { resolveMemberDisplayName } from "@/lib/member-display";
import { VideoCallRoom } from "@/components/VideoCallRoom";

export default function VideoCallPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tc = useTranslations("common");
  const t = useTranslations("videoCalls");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const { isMember } = useRequireMember();
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("Member");
  const [loading, setLoading] = useState(true);

  const callId = searchParams.get("callId");
  const autoJoin =
    searchParams.get("autoJoin") === "1" ||
    searchParams.get("autoJoin") === "true";

  useEffect(() => {
    void params.then((value) => setConnectionId(value.connectionId));
  }, [params]);

  useEffect(() => {
    if (!mounted || !connectionId || !authToken) return;

    async function load() {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;
      try {
        const session = await getSession(token);
        if (!session.termsAccepted) {
          router.replace("/profile");
          return;
        }
        const thread = await listConnectionMessages(token, connectionId!);
        setMemberName(
          resolveMemberDisplayName(thread.member, {
            profileRef: (code) => t("profileRef", { code }),
            anonymous: t("unknownMember"),
          }),
        );
      } catch {
        try {
          const connections = await listMyConnections(token);
          const match = connections.find((c) => c.connectionId === connectionId);
          if (match) {
            setMemberName(
              resolveMemberDisplayName(match.member, {
                profileRef: (code) => t("profileRef", { code }),
                anonymous: t("unknownMember"),
              }),
            );
          }
        } catch {
          /* API unreachable — VideoCallRoom can still load the call by callId */
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [mounted, connectionId, authToken, router, t]);

  if (!mounted || !isMember || !connectionId || loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (!authToken) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{t("signInRequired")}</p>
      </main>
    );
  }

  if (!callId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{t("missingCallId")}</p>
        <Link
          href={`/messages/${connectionId}`}
          className="mt-4 inline-block text-sm font-medium text-rose-800"
        >
          {t("backToChat")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
      <VideoCallRoom
        connectionId={connectionId}
        callId={callId}
        memberName={memberName}
        autoJoin={autoJoin}
      />
    </main>
  );
}
