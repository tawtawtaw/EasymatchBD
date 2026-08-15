"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { AuthenticatedBlobImage } from "@/components/AuthenticatedBlobImage";
import { PaidMembershipRequired } from "@/components/PaidMembershipRequired";
import { VerificationBadge } from "@/components/VerificationBadge";
import { DiscoveryFieldSection } from "@/components/DiscoveryFieldSection";
import { AUTH_TOKEN_KEY, DropdownMap, getDropdowns } from "@/lib/api";
import { useLocale } from "next-intl";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMounted } from "@/hooks/use-mounted";
import { membershipFromSession } from "@/lib/membership";
import {
  DiscoveryProfile,
  discoveryPhotoUrl,
  fetchDiscoveryBlob,
  getDiscoveryProfile,
  requestPrivacyUpgrade,
  respondDiscoveryInterest,
  respondPrivacyUpgrade,
  sendDiscoveryInterest,
  type DiscoveryRelationship,
} from "@/lib/discovery";
import { resolveMemberDisplayName } from "@/lib/member-display";
import { memberComplaintHref } from "@/lib/member-complaints";
import { ProfileBookmarkButton } from "@/components/ProfileBookmarkButton";
import { DiscoveryProfileInterestFooter } from "@/components/DiscoveryProfileInterestFooter";
import { ProfilePhotoLightbox } from "@/components/ProfilePhotoLightbox";
import { visibleProfilePhotoIds } from "@easymatch/shared";

export default function DiscoveryProfilePage() {
  const params = useParams<{ profileId: string }>();
  const profileId = params.profileId;
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("discovery");
  const tp = useTranslations("privacy");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const { user: session, ready: sessionReady } = useAuthSession();
  const isPaid = membershipFromSession(session);
  const [profile, setProfile] = useState<DiscoveryProfile | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [data, dd] = await Promise.all([
        getDiscoveryProfile(token, profileId),
        getDropdowns(locale),
      ]);
      setProfile(data);
      setDropdowns(dd);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }, [profileId, router, t, locale]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  async function runAction(action: () => Promise<unknown>) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(t("actions.success"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(false);
    }
  }

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (!profile || !authToken) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{error ?? t("signInRequired")}</p>
      </main>
    );
  }

  const name = resolveMemberDisplayName(
    {
      fullName:
        typeof profile.personal.full_name === "string"
          ? profile.personal.full_name
          : null,
      profileCode: profile.profileCode,
    },
    {
      profileRef: (code) => t("profileRef", { code }),
      anonymous: t("member"),
    },
  );
  const rel = profile.relationship;
  const nextLevel = (rel.connectionPrivacyLevel ?? rel.viewerPrivacyLevel) + 1;
  const isSelf = rel.status === "self";
  const galleryPhotoIds = visibleProfilePhotoIds(profile.media);

  function openGallery(photoId?: string) {
    if (!galleryPhotoIds.length) return;
    const index = photoId
      ? Math.max(0, galleryPhotoIds.indexOf(photoId))
      : 0;
    setGalleryIndex(index);
  }

  async function handleSendInterest() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setActing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await sendDiscoveryInterest(token, profileId);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              relationship: {
                ...prev.relationship,
                status: result.status as DiscoveryRelationship["status"],
              },
            }
          : prev,
      );
      setMessage(t("actions.success"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(false);
    }
  }

  async function handleRespondIncomingInterest(accept: boolean) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !rel.receivedInterestId) return;

    setActing(true);
    setError(null);
    setMessage(null);
    try {
      await respondDiscoveryInterest(token, rel.receivedInterestId, accept);
      if (accept) {
        router.push("/connections");
        return;
      }
      setMessage(t("actions.success"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href="/discovery"
        className="text-sm font-medium text-rose-800 hover:underline"
      >
        {t("backToList")}
      </Link>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <header className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="mx-auto w-36 shrink-0 sm:mx-0">
            <div className="h-48 w-36 overflow-hidden rounded-lg bg-zinc-100">
            {profile.media.primaryPhotoId ? (
              <button
                type="button"
                onClick={() => openGallery(profile.media.primaryPhotoId ?? undefined)}
                className="h-full w-full"
              >
                <AuthenticatedBlobImage
                  token={authToken}
                  path={discoveryPhotoUrl(
                    profile.profileCode,
                    profile.media.primaryPhotoId,
                    "thumb",
                  )}
                  alt={name}
                  className="h-full w-full object-cover"
                  protect
                  fetchBlob={(token, path) => {
                    const match = path.match(
                      /\/discovery\/profiles\/([^/]+)\/photos\/([^/]+)\/file/,
                    );
                    if (!match) throw new Error("Invalid photo path");
                    return fetchDiscoveryBlob(token, match[1], match[2], "thumb");
                  }}
                />
              </button>
            ) : (
              <div className="flex h-full items-center justify-center text-2xl text-zinc-500">
                {name.charAt(0)}
              </div>
            )}
            </div>
            {galleryPhotoIds.length > 0 ? (
              <p className="mt-2 text-center text-xs text-rose-800 sm:text-left">
                {t("galleryOpenHint")}
              </p>
            ) : null}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-900">{name}</h1>
              <VerificationBadge
                isVerified={profile.media.isVerified}
                verifiedOnBehalf={profile.media.verifiedOnBehalf}
                memberNidVerified={profile.media.memberNidVerified}
              />
            </div>
            <p className="mt-1 text-sm font-mono text-zinc-600">
              {t("profileCodeLabel", { code: profile.profileCode })}
            </p>
            {profile.compatibility.totalCriteria > 0 ? (
              <p className="mt-2 text-sm font-semibold text-emerald-800">
                {t("compatibilityScore", {
                  score: profile.compatibility.score,
                })}{" "}
                <span className="font-normal text-zinc-600">
                  ({t("compatibilityDetail", {
                    matched: profile.compatibility.matchedCount,
                    total: profile.compatibility.totalCriteria,
                  })})
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                {t("compatibilityUnavailable")}
              </p>
            )}
            <p className="mt-1 text-sm text-zinc-600">
              {t("privacyLevel", {
                level: profile.viewerPrivacyLevel,
                label: tp(String(profile.viewerPrivacyLevel)),
              })}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {t("cumulativePrivacyHint", {
                level: profile.viewerPrivacyLevel,
              })}
            </p>
            {profile.hiddenFieldCount > 0 ? (
              <p className="mt-1 text-sm text-amber-800">
                {t("hiddenFields", { count: profile.hiddenFieldCount })}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {!isSelf && !isPaid && sessionReady ? (
                <PaidMembershipRequired feature="interest" compact />
              ) : null}
              {!isSelf ? (
                <>
                  <ProfileBookmarkButton
                    profileId={profile.profileId}
                    profileCode={profile.profileCode}
                    isBookmarked={profile.isBookmarked ?? false}
                  />
                  <Link
                    href={`/discovery/${profile.profileCode}/compare`}
                    className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-900 hover:bg-rose-50"
                  >
                    {t("compareWithMe")}
                  </Link>
                  <Link
                    href={memberComplaintHref(profile.profileCode)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    {t("fileComplaint")}
                  </Link>
                </>
              ) : null}
              {isPaid && rel.status === "none" ? (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void handleSendInterest()}
                  className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                >
                  {t("expressInterest")}
                </button>
              ) : null}
              {rel.status === "interest_sent" ? (
                <span className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
                  {t("interestSent")}
                </span>
              ) : null}
              {rel.status === "interest_received" ? (
                <span className="rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-900">
                  {t("interestReceived")}
                </span>
              ) : null}
              {isPaid && rel.status === "connected" ? (
                <>
                  <span className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-900">
                    {t("connected")}
                  </span>
                  {rel.connectionId ? (
                    <Link
                      href={`/messages/${rel.connectionId}`}
                      className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
                    >
                      {t("message")}
                    </Link>
                  ) : null}
                </>
              ) : null}
              {isPaid &&
              rel.status === "connected" &&
              rel.connectionPrivacyLevel !== null &&
              rel.connectionPrivacyLevel < 3 &&
              !rel.pendingUpgradeLevel ? (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() =>
                    void runAction(() =>
                      requestPrivacyUpgrade(
                        localStorage.getItem(AUTH_TOKEN_KEY)!,
                        profileId,
                      ),
                    )
                  }
                  className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-50 disabled:opacity-60"
                >
                  {t("requestUpgrade", { level: nextLevel })}
                </button>
              ) : null}
              {rel.pendingUpgradeByMe && rel.pendingUpgradeLevel ? (
                <span className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
                  {t("upgradePending", { level: rel.pendingUpgradeLevel })}
                </span>
              ) : null}
              {rel.pendingUpgradeLevel &&
              !rel.pendingUpgradeByMe &&
              rel.status === "connected" ? (
                <>
                  <span className="rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-900">
                    {t("upgradeIncoming", { level: rel.pendingUpgradeLevel })}
                  </span>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() =>
                      void runAction(() =>
                        respondPrivacyUpgrade(
                          localStorage.getItem(AUTH_TOKEN_KEY)!,
                          profileId,
                          true,
                        ),
                      )
                    }
                    className="rounded-lg bg-rose-800 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                  >
                    {t("acceptUpgrade")}
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() =>
                      void runAction(() =>
                        respondPrivacyUpgrade(
                          localStorage.getItem(AUTH_TOKEN_KEY)!,
                          profileId,
                          false,
                        ),
                      )
                    }
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                  >
                    {t("declineUpgrade")}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {profile.media.galleryPhotoIds.length > 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-zinc-900">{t("additionalPhotos")}</h2>
          <p className="mb-1 text-sm text-rose-800">{t("galleryOpenHint")}</p>
          <p className="mb-3 text-xs text-zinc-500">{t("photoConfidentialNotice")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.media.galleryPhotoIds.map((photoId) => (
              <button
                key={photoId}
                type="button"
                onClick={() => openGallery(photoId)}
                className="overflow-hidden rounded-lg"
              >
                <AuthenticatedBlobImage
                  token={authToken}
                  path={discoveryPhotoUrl(profile.profileCode, photoId, "thumb")}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                  protect
                  fetchBlob={(token, path) => {
                    const match = path.match(
                      /\/discovery\/profiles\/([^/]+)\/photos\/([^/]+)\/file/,
                    );
                    if (!match) throw new Error("Invalid photo path");
                    return fetchDiscoveryBlob(token, match[1], match[2], "thumb");
                  }}
                />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {galleryIndex !== null && galleryPhotoIds.length > 0 ? (
        <ProfilePhotoLightbox
          token={authToken}
          profileId={profile.profileCode}
          photoIds={galleryPhotoIds}
          index={galleryIndex}
          alt={name}
          onClose={() => setGalleryIndex(null)}
          onIndexChange={setGalleryIndex}
        />
      ) : null}

      <div className="mt-6 space-y-5">
      <DiscoveryFieldSection
        title={t("sections.personal")}
        kind="personal"
        data={profile.personal}
        dropdowns={dropdowns}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={t("sections.family")}
        kind="family"
        data={profile.family}
        dropdowns={dropdowns}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={t("sections.marital")}
        kind="marital"
        data={profile.marital}
        dropdowns={dropdowns}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={t("sections.siblings")}
        kind="siblings"
        data={profile.siblings}
        dropdowns={dropdowns}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={t("sections.paternalRelatives")}
        kind="paternal_relatives"
        data={profile.paternalRelatives}
        dropdowns={dropdowns}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={t("sections.maternalRelatives")}
        kind="maternal_relatives"
        data={profile.maternalRelatives}
        dropdowns={dropdowns}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={t("sections.partner")}
        kind="partner"
        data={profile.partner}
        dropdowns={dropdowns}
        personal={profile.personal}
      />
      </div>

      <DiscoveryProfileInterestFooter
        isSelf={isSelf}
        isPaid={isPaid}
        sessionReady={sessionReady}
        rel={rel}
        acting={acting}
        onSendInterest={() => void handleSendInterest()}
      />

      {rel.status === "interest_received" && rel.receivedInterestId ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          {!isPaid && sessionReady ? (
            <PaidMembershipRequired feature="interest" compact />
          ) : (
            <>
              <h2 className="text-lg font-semibold text-zinc-900">
                {t("interestReceived")}
              </h2>
              <p className="mt-2 text-sm text-zinc-700">
                {t("incomingInterestPrompt")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void handleRespondIncomingInterest(true)}
                  className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                >
                  {t("acceptInterest")}
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void handleRespondIncomingInterest(false)}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {t("declineInterest")}
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}
    </main>
  );
}
