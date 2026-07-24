"use client";

import { useTranslations, useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { AuthenticatedBlobImage } from "@/components/AuthenticatedBlobImage";
import { VerificationProfileDetails } from "@/components/VerificationProfileDetails";
import { VerificationRejectDialog } from "@/components/VerificationRejectDialog";
import { VerificationAuditBiodataPdfButton } from "@/components/VerificationAuditBiodataPdfButton";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, DropdownMap, getDropdowns, getMe } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import { isOtherGalleryPhoto } from "@easymatch/shared";
import {
  fetchVerificationBlob,
  getVerificationQueue,
  getVerificationSubmission,
  isOfficerRole,
  officerNidUrl,
  officerPhotoUrl,
  reviewNid,
  reviewPhoto,
  reviewProfileBiodata,
  VerificationQueueItem,
  VerificationSubmission,
} from "@/lib/verification";

function statusClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-amber-100 text-amber-900";
  }
}

type RejectTarget =
  | {
      kind: "photo";
      photoId: string;
      photoType: "primary" | "gallery";
      gallerySortOrder?: number;
    }
  | { kind: "biodata" }
  | { kind: "nid"; subject: "member" | "creator" };

export default function VerificationPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("verification");
  const tc = useTranslations("common");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [queue, setQueue] = useState<VerificationQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<VerificationSubmission | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const mounted = useMounted();
  const authToken = useAuthToken();

  const loadQueue = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    const items = await getVerificationQueue(token);
    setQueue(items);
    if (items.length > 0 && !selectedId) {
      setSelectedId(items[0].profileId);
    }
  }, [selectedId]);

  const loadSubmission = useCallback(async (profileId: string) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    const data = await getVerificationSubmission(token, profileId);
    setSubmission(data);
  }, []);

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
        return loadQueue();
      })
      .catch(() => router.replace("/auth"))
      .finally(() => setLoading(false));
  }, [router, loadQueue]);

  useEffect(() => {
    if (!selectedId || !authorized) return;
    loadSubmission(selectedId).catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load"),
    );
  }, [selectedId, authorized, loadSubmission]);

  useEffect(() => {
    void getDropdowns(locale).then(setDropdowns).catch(() => undefined);
  }, [locale]);

  async function refresh() {
    await loadQueue();
    if (selectedId) {
      await loadSubmission(selectedId);
    }
  }

  async function handlePhotoReview(
    photoId: string,
    decision: "approved" | "rejected",
    officerMessage?: string,
  ) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(photoId);
    setError(null);
    try {
      await reviewPhoto(token, photoId, decision, officerMessage);
      setMessage(t(decision === "approved" ? "photoApproved" : "photoRejected"));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setActing(null);
    }
  }

  async function handleBiodataReview(
    decision: "approved" | "rejected",
    officerMessage?: string,
  ) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !submission) return;
    setActing(`biodata-${decision}`);
    setError(null);
    try {
      await reviewProfileBiodata(
        token,
        submission.profileId,
        decision,
        officerMessage,
      );
      setMessage(
        t(decision === "approved" ? "biodataApproved" : "biodataRejected"),
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setActing(null);
    }
  }

  async function handleNidReview(
    decision: "approved" | "rejected",
    subject: "member" | "creator" = "member",
    officerMessage?: string,
  ) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !submission) return;
    setActing(`nid-${subject}-${decision}`);
    setError(null);
    try {
      await reviewNid(token, submission.profileId, decision, subject, officerMessage);
      setMessage(t(decision === "approved" ? "nidApproved" : "nidRejected"));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setActing(null);
    }
  }

  async function confirmReject(officerMessage: string) {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    if (target.kind === "photo") {
      await handlePhotoReview(target.photoId, "rejected", officerMessage);
      return;
    }
    if (target.kind === "biodata") {
      await handleBiodataReview("rejected", officerMessage);
      return;
    }
    await handleNidReview("rejected", target.subject, officerMessage);
  }

  function rejectDialogCopy(target: RejectTarget) {
    if (target.kind === "photo") {
      const titleKey =
        target.photoType === "primary"
          ? "rejectDialog.photoPrimaryTitle"
          : target.gallerySortOrder === 0
            ? "rejectDialog.otherPhotoTitle"
            : "rejectDialog.familyPhotoTitle";
      const hintKey =
        target.photoType === "primary"
          ? "rejectDialog.photoPrimaryHint"
          : target.gallerySortOrder === 0
            ? "rejectDialog.otherPhotoHint"
            : "rejectDialog.familyPhotoHint";
      return {
        title: t(titleKey),
        hint: t(hintKey),
      };
    }
    if (target.kind === "biodata") {
      return {
        title: t("rejectDialog.biodataTitle"),
        hint: t("rejectDialog.biodataHint"),
      };
    }
    return {
      title: t(
        target.subject === "creator"
          ? "rejectDialog.creatorNidTitle"
          : "rejectDialog.nidTitle",
      ),
      hint: t(
        target.subject === "creator"
          ? "rejectDialog.creatorNidHint"
          : "rejectDialog.nidHint",
      ),
    };
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-700">
        {tc("loading")}
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold text-zinc-900">{t("accessDenied")}</p>
        <p className="max-w-md text-sm text-zinc-600">{t("accessDeniedHint")}</p>
        <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
          {tc("home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/verification/home" className="text-sm font-medium text-rose-700 hover:underline">
              {tc("home")}
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">{t("title")}</h1>
            <p className="text-sm text-zinc-600">{t("subtitle")}</p>
          </div>
          <p className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-900">
            {t("queueCount", { count: queue.length })}
          </p>
        </div>

        {message && (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-zinc-300 bg-white p-4 shadow-md">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">
              {t("pendingQueue")}
            </h2>
            {queue.length === 0 ? (
              <p className="text-sm text-zinc-600">{t("emptyQueue")}</p>
            ) : (
              <ul className="space-y-2">
                {queue.map((item) => (
                  <li key={item.profileId}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(item.profileId);
                        setMessage(null);
                        setError(null);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selectedId === item.profileId
                          ? "border-rose-400 bg-rose-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <p className="font-semibold text-zinc-900">
                        {item.fullName || t("unnamed")}
                      </p>
                      <p className="text-xs font-mono text-zinc-600">
                        {item.profileCode}
                      </p>
                      <p className="text-xs text-zinc-600">{item.phone}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.pendingPhotoCount > 0 &&
                          t("pendingPhotos", { count: item.pendingPhotoCount })}
                        {item.pendingPhotoCount > 0 &&
                          (item.nidReadyForReview || item.biodataPending) &&
                          " · "}
                        {item.nidReadyForReview && t("nidPending")}
                        {item.nidReadyForReview && item.creatorNidReadyForReview && " · "}
                        {item.creatorNidReadyForReview && t("creatorNidPending")}
                        {(item.nidReadyForReview || item.creatorNidReadyForReview) &&
                          item.biodataPending &&
                          " · "}
                        {item.biodataPending && t("biodataPending")}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <main className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md">
            {!submission ? (
              <p className="text-sm text-zinc-600">{t("selectSubmission")}</p>
            ) : (
              <div className="space-y-8">
                <section className="rounded-xl border border-zinc-200 bg-white p-4">
                  <h2 className="text-lg font-bold text-zinc-900">{t("applicant")}</h2>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-zinc-500">{t("fullName")}</dt>
                      <dd className="font-semibold text-zinc-900">
                        {submission.personal.fullName || t("unnamed")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">{t("phone")}</dt>
                      <dd className="font-semibold text-zinc-900">{submission.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">{t("phoneVerified")}</dt>
                      <dd className="font-semibold text-zinc-900">
                        {submission.phoneVerifiedAt ? t("phoneVerifiedYes") : t("phoneVerifiedNo")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">{t("fullyVerified")}</dt>
                      <dd className="font-semibold text-zinc-900">
                        {submission.isVerified
                          ? submission.verifiedOnBehalf
                            ? submission.nidVerifiedAt
                              ? t("fullyVerifiedOnBehalfDualYes")
                              : t("fullyVerifiedOnBehalfYes")
                            : t("fullyVerifiedYes")
                          : t("fullyVerifiedNo")}
                      </dd>
                    </div>
                    {submission.creationMode === "on_behalf" ? (
                      <div className="sm:col-span-2">
                        <dt className="text-zinc-500">{t("creationMode")}</dt>
                        <dd className="font-semibold text-zinc-900">
                          {t("onBehalfProfile", {
                            relation: submission.onBehalfRelation
                              ? t(`onBehalfRelations.${submission.onBehalfRelation}`)
                              : t("onBehalfRelations.someone_else"),
                          })}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {authToken && submission.profileCode ? (
                    <div className="mt-4 border-t border-zinc-100 pt-4">
                      <VerificationAuditBiodataPdfButton
                        profileId={submission.profileId}
                        profileCode={submission.profileCode}
                        authToken={authToken}
                        dropdowns={dropdowns}
                      />
                    </div>
                  ) : null}
                </section>

                <VerificationProfileDetails
                  submission={submission}
                  acting={acting}
                  onBiodataReview={handleBiodataReview}
                  onRequestBiodataReject={() => setRejectTarget({ kind: "biodata" })}
                  dropdowns={dropdowns}
                />

                <section className="border-t border-zinc-200 pt-8">
                  <h2 className="text-lg font-bold text-zinc-900">{t("photosSection")}</h2>
                  {submission.photos.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-600">{t("noPhotos")}</p>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {submission.photos.map((photo) => {
                        const photoLabel =
                          photo.type === "primary"
                            ? t("primaryPhoto")
                            : isOtherGalleryPhoto(photo)
                              ? t("otherPhoto")
                              : t("familyPhoto");

                        return (
                        <div
                          key={photo.id}
                          className="rounded-xl border border-zinc-200 p-3"
                        >
                          {mounted && authToken && photo.mimeType.startsWith("image/") && (
                            <AuthenticatedBlobImage
                              token={authToken}
                              path={officerPhotoUrl(submission.profileId, photo.id)}
                              alt={photo.type}
                              fetchBlob={fetchVerificationBlob}
                              className="mb-3 aspect-square w-full rounded-lg border border-zinc-200 object-cover"
                            />
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-zinc-500">
                              {photoLabel}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(photo.status)}`}
                            >
                              {t(`status.${photo.status}`)}
                            </span>
                          </div>
                          {photo.status === "pending" && (
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                disabled={acting === photo.id}
                                onClick={() => handlePhotoReview(photo.id, "approved")}
                                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                              >
                                {t("approve")}
                              </button>
                              <button
                                type="button"
                                disabled={acting === photo.id}
                                onClick={() =>
                                  setRejectTarget({
                                    kind: "photo",
                                    photoId: photo.id,
                                    photoType: photo.type,
                                    gallerySortOrder:
                                      photo.type === "gallery"
                                        ? photo.sortOrder
                                        : undefined,
                                  })
                                }
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                {t("reject")}
                              </button>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {(["creator", "member"] as const)
                  .filter((subject) =>
                    subject === "creator"
                      ? submission.creationMode === "on_behalf"
                      : true,
                  )
                  .map((subject) => {
                    const docs = submission.nidDocuments.filter(
                      (doc) => doc.subject === subject,
                    );
                    const verifiedAt =
                      subject === "creator"
                        ? submission.creatorNidVerifiedAt
                        : submission.nidVerifiedAt;
                    const readyForReview =
                      subject === "creator"
                        ? submission.creatorNidReadyForReview
                        : submission.nidReadyForReview;
                    const sectionTitle =
                      subject === "creator" ? t("creatorNidSection") : t("nidSection");
                    const optional =
                      subject === "member" && submission.creationMode === "on_behalf";

                    return (
                      <section key={subject} className="border-t border-zinc-200 pt-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-bold text-zinc-900">
                            {sectionTitle}
                            {optional ? (
                              <span className="ml-2 text-sm font-normal text-zinc-500">
                                ({t("optional")})
                              </span>
                            ) : null}
                          </h2>
                          {verifiedAt ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                              {t("nidVerified")}
                            </span>
                          ) : readyForReview ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                              {t("status.pending")}
                            </span>
                          ) : null}
                        </div>

                        {docs.length === 0 ? (
                          <p className="mt-2 text-sm text-zinc-600">{t("noNid")}</p>
                        ) : (
                          <>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              {docs.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="rounded-xl border border-zinc-200 p-3"
                                >
                                  <p className="mb-2 text-sm font-semibold text-zinc-900">
                                    {doc.side === "front" ? t("nidFront") : t("nidBack")}
                                  </p>
                                  {mounted && authToken && doc.mimeType.startsWith("image/") ? (
                                    <AuthenticatedBlobImage
                                      token={authToken}
                                      path={officerNidUrl(
                                        submission.profileId,
                                        doc.side,
                                        subject,
                                      )}
                                      alt={doc.side}
                                      fetchBlob={fetchVerificationBlob}
                                      className="mb-2 h-40 w-full rounded-lg border border-zinc-200 bg-white object-contain"
                                    />
                                  ) : mounted && authToken ? (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const blob = await fetchVerificationBlob(
                                          authToken,
                                          officerNidUrl(
                                            submission.profileId,
                                            doc.side,
                                            subject,
                                          ),
                                        );
                                        const url = URL.createObjectURL(blob);
                                        window.open(url, "_blank");
                                        setTimeout(() => URL.revokeObjectURL(url), 60_000);
                                      }}
                                      className="text-sm font-medium text-rose-700 hover:underline"
                                    >
                                      {t("viewPdf")}
                                    </button>
                                  ) : null}
                                  <span
                                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(doc.status)}`}
                                  >
                                    {t(`status.${doc.status}`)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {readyForReview && !verifiedAt ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={acting?.startsWith(`nid-${subject}-`) ?? false}
                                  onClick={() => handleNidReview("approved", subject)}
                                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                                >
                                  {t("approveNidOnly")}
                                </button>
                                <button
                                  type="button"
                                  disabled={acting?.startsWith(`nid-${subject}-`) ?? false}
                                  onClick={() =>
                                    setRejectTarget({ kind: "nid", subject })
                                  }
                                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {t("rejectNid")}
                                </button>
                              </div>
                            ) : null}
                          </>
                        )}
                      </section>
                    );
                  })}
              </div>
            )}
          </main>
        </div>
      </div>

      {rejectTarget ? (
        <VerificationRejectDialog
          {...rejectDialogCopy(rejectTarget)}
          submitting={Boolean(acting)}
          onCancel={() => setRejectTarget(null)}
          onConfirm={(officerMessage) => void confirmReject(officerMessage)}
        />
      ) : null}
    </div>
  );
}
