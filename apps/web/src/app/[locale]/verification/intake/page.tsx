"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { StaffAssistedIntakePanel } from "@/components/StaffAssistedIntakePanel";
import { AUTH_TOKEN_KEY, DropdownMap, getDropdowns, getMe } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { isOfficerRole } from "@/lib/verification";

export default function VerificationIntakePage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("verification.staffAssisted");
  const tv = useTranslations("verification");
  const tc = useTranslations("common");
  const authToken = useAuthToken();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }
    getMe(token)
      .then((user) => {
        if (!isOfficerRole(user.role)) {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
      })
      .catch(() => router.replace("/auth"));
  }, [router]);

  useEffect(() => {
    void getDropdowns(locale).then(setDropdowns).catch(() => undefined);
  }, [locale]);

  if (authorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-zinc-600">{tc("loading")}</p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold text-zinc-900">{tv("accessDenied")}</p>
        <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
          {tc("home")}
        </Link>
      </div>
    );
  }

  const token =
    authToken ??
    (typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY)
      : null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/verification/home"
            className="text-sm font-medium text-rose-700 hover:underline"
          >
            {tc("home")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">{t("pageTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-600">{t("pageSubtitle")}</p>
        </div>

        {message ? (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {token ? (
          <StaffAssistedIntakePanel
            token={token}
            dropdowns={dropdowns}
            onError={setError}
            onMessage={setMessage}
            onCreated={() => {
              setMessage(t("created"));
            }}
          />
        ) : (
          <p className="text-sm text-zinc-600">{tc("loading")}</p>
        )}

        <Link
          href="/verification"
          className="inline-flex text-sm font-semibold text-rose-800 hover:underline"
        >
          {t("openQueue")} →
        </Link>
      </div>
    </div>
  );
}
