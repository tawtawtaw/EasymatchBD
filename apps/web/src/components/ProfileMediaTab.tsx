"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { isOnBehalfProfile, canAddFamilyGalleryPhoto, canAddOtherGalleryPhoto, splitGalleryPhotos } from "@easymatch/shared";
import { VerificationFeedbackPanel } from "@/components/VerificationFeedbackPanel";
import {
  deleteNidDocument,
  deleteProfilePhoto,
  dismissVerificationAlerts,
  fetchAuthenticatedBlob,
  getProfileMedia,
  nidFileUrl,
  NidDocumentSide,
  NidDocumentSubject,
  NidStatus,
  PHOTO_ACCEPT,
  NID_ACCEPT,
  photoFileUrl,
  ProfileMedia,
  ProfilePhoto,
  setPrimaryPhoto,
  uploadNidDocument,
  submitForVerification,
  uploadProfilePhoto,
  validateNidFile,
  validatePhotoFile,
} from "@/lib/media";
import {
  GALLERY_PHOTO_ASPECT,
  PRIMARY_PHOTO_ASPECT,
} from "@/lib/photo-crop";
import { PhotoCropModal } from "@/components/PhotoCropModal";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  computeVerificationSubmitState,
  isVerificationPackageComplete,
} from "@/lib/verification-submit-state";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";

const VERIFICATION_SUBMITTED_KEY = "easymatch_verification_submitted";

function isPackageComplete(media: ProfileMedia) {
  return isVerificationPackageComplete(media);
}

type ProfileMediaTabProps = {
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
  onProfileRefresh?: () => Promise<void>;
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "approved":
    case "verified":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

function AuthenticatedImage({
  token,
  path,
  alt,
  className,
}: {
  token: string;
  path: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    fetchAuthenticatedBlob(token, path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, path]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-zinc-100 text-xs text-zinc-500 ${className ?? ""}`}>
        …
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}

function UploadCard({
  title,
  hint,
  accept,
  disabled,
  uploading,
  onSelect,
  children,
  required,
}: {
  title: string;
  hint: string;
  accept: string;
  disabled?: boolean;
  uploading?: boolean;
  onSelect: (file: File) => void;
  children?: ReactNode;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tc = useTranslations("common");

  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900">
            {title}
            {required ? (
              <span className="text-rose-700" aria-hidden="true">
                {" "}
                *
              </span>
            ) : null}
          </h3>
          <p className="mt-1 text-sm text-zinc-600">{hint}</p>
        </div>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
        >
          {uploading ? tc("loading") : tc("select")}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function ProfileMediaTab({
  onError,
  onMessage,
  onProfileRefresh,
}: ProfileMediaTabProps) {
  const t = useTranslations("profile.media");
  const te = useTranslations("profile.errors");
  const tc = useTranslations("common");
  const [media, setMedia] = useState<ProfileMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dismissingAlerts, setDismissingAlerts] = useState(false);
  const [submittedAck, setSubmittedAck] = useState(false);
  const [cropRequest, setCropRequest] = useState<{
    file: File;
    type: "primary" | "gallery";
    gallerySlot?: "other" | "family";
  } | null>(null);
  const mounted = useMounted();
  const authToken = useAuthToken();

  function markSubmitted() {
    setSubmittedAck(true);
    sessionStorage.setItem(VERIFICATION_SUBMITTED_KEY, "1");
  }

  function clearSubmitted() {
    setSubmittedAck(false);
    sessionStorage.removeItem(VERIFICATION_SUBMITTED_KEY);
  }

  const loadMedia = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    const data = await getProfileMedia(token);
    setMedia(data);
  }, []);

  useEffect(() => {
    loadMedia()
      .catch((err) =>
        onError(err instanceof Error ? err.message : "Failed to load media"),
      )
      .finally(() => setLoading(false));
  }, [loadMedia, onError]);

  useEffect(() => {
    if (!media) return;

    const { canResubmit } = computeVerificationSubmitState(media);

    if (
      media.nidStatus === "rejected" ||
      media.creatorNidStatus === "rejected" ||
      media.profileBiodataReviewStatus === "rejected"
    ) {
      clearSubmitted();
      return;
    }

    if (canResubmit) {
      clearSubmitted();
      return;
    }

    const stored = sessionStorage.getItem(VERIFICATION_SUBMITTED_KEY) === "1";
    if (media.isVerified || media.profileBiodataReviewStatus === "pending") {
      setSubmittedAck(true);
    } else if (!stored) {
      setSubmittedAck(false);
    }
  }, [media]);

  async function handlePhotoUpload(
    type: "primary" | "gallery",
    file: File,
    gallerySlot?: "other" | "family",
  ) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    const validationKey = validatePhotoFile(file);
    if (validationKey) {
      onError(te(validationKey));
      return;
    }

    setUploading(type === "gallery" ? `gallery-${gallerySlot ?? "other"}` : type);
    onError(null);
    try {
      await uploadProfilePhoto(token, file, type, gallerySlot);
      await loadMedia();
      onMessage(t("photoUploaded"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  function handlePhotoSelected(
    type: "primary" | "gallery",
    file: File,
    gallerySlot?: "other" | "family",
  ) {
    const validationKey = validatePhotoFile(file);
    if (validationKey) {
      onError(te(validationKey));
      return;
    }
    onError(null);
    setCropRequest({ file, type, gallerySlot });
  }

  function handleCropConfirm(croppedFile: File) {
    const type = cropRequest?.type;
    const gallerySlot = cropRequest?.gallerySlot;
    setCropRequest(null);
    if (!type) return;
    void handlePhotoUpload(type, croppedFile, gallerySlot);
  }

  async function handleNidUpload(
    side: NidDocumentSide,
    subject: NidDocumentSubject,
    file: File,
  ) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    const validationKey = validateNidFile(file);
    if (validationKey) {
      onError(te(validationKey));
      return;
    }

    const uploadKey = `${subject}-${side}`;
    setUploading(uploadKey);
    onError(null);
    try {
      clearSubmitted();
      await uploadNidDocument(token, file, side, subject);
      await loadMedia();
      onMessage(t("nidUploaded"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleDeletePhoto(photo: ProfilePhoto) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setUploading(photo.id);
    try {
      await deleteProfilePhoto(token, photo.id);
      await loadMedia();
      onMessage(t("photoRemoved"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleSetPrimary(photo: ProfilePhoto) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setUploading(photo.id);
    try {
      await setPrimaryPhoto(token, photo.id);
      await loadMedia();
      onMessage(t("primarySet"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleDeleteNid(
    side: NidDocumentSide,
    subject: NidDocumentSubject,
  ) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    const uploadKey = `${subject}-${side}`;
    setUploading(uploadKey);
    try {
      await deleteNidDocument(token, side, subject);
      await loadMedia();
      onMessage(t("nidRemoved"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmitForReview() {
    if (!media) return;

    const onBehalf = media ? isOnBehalfProfile(media) : false;
    const requiredSubject: NidDocumentSubject = onBehalf ? "creator" : "member";
    const requiredDocs = media?.nidDocuments.filter(
      (doc) => doc.subject === requiredSubject,
    ) ?? [];

    const missing: string[] = [];
    if (!media.photos.some((p) => p.type === "primary")) {
      missing.push(t("passportPhoto"));
    }
    if (!requiredDocs.some((d) => d.side === "front")) {
      missing.push(
        onBehalf ? t("creatorNidFront") : t("nidFront"),
      );
    }
    if (!requiredDocs.some((d) => d.side === "back")) {
      missing.push(onBehalf ? t("creatorNidBack") : t("nidBack"));
    }

    if (missing.length > 0) {
      onError(t("submitMissing", { items: missing.join(", ") }));
      onMessage(null);
      return;
    }

    const { canResubmit, nidRejected } = computeVerificationSubmitState(media);
    const awaitingReview =
      media.profileBiodataReviewStatus === "pending" &&
      (submittedAck || !canResubmit);

    if (nidRejected) {
      onError(t("submitRejectedNid"));
      onMessage(null);
      return;
    }

    if (awaitingReview) {
      onMessage(t("submittedForReview"));
      return;
    }

    if (media.isVerified) {
      onMessage(t("submittedForReview"));
      return;
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setSubmitting(true);
    onError(null);
    try {
      const result = await submitForVerification(token);
      await loadMedia();
      await onProfileRefresh?.();
      if (result.submitted) {
        markSubmitted();
        onMessage(t("submittedForReview"));
      } else {
        clearSubmitted();
        onError(result.message ?? t("submitNotQueued"));
      }
    } catch (err) {
      clearSubmitted();
      onError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDismissAlerts() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setDismissingAlerts(true);
    try {
      await dismissVerificationAlerts(token);
      await loadMedia();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to dismiss alerts");
    } finally {
      setDismissingAlerts(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">{t("loading")}</p>;
  }

  const primaryPhoto = media?.photos.find((p) => p.type === "primary");
  const galleryPhotos = media?.photos.filter((p) => p.type === "gallery") ?? [];
  const { otherPhoto, familyPhotos } = splitGalleryPhotos(galleryPhotos);
  const canAddOther = canAddOtherGalleryPhoto(galleryPhotos.length, otherPhoto);
  const canAddFamily = canAddFamilyGalleryPhoto(galleryPhotos.length, familyPhotos);
  const onBehalf = media ? isOnBehalfProfile(media) : false;

  function docsForSubject(subject: NidDocumentSubject) {
    return media?.nidDocuments.filter((doc) => doc.subject === subject) ?? [];
  }

  function renderNidSection({
    subject,
    title,
    hint,
    status,
    lockedAt,
    required,
  }: {
    subject: NidDocumentSubject;
    title: string;
    hint: string;
    status: NidStatus;
    lockedAt: string | null | undefined;
    required: boolean;
  }) {
    const docs = docsForSubject(subject);
    const nidFront = docs.find((d) => d.side === "front");
    const nidBack = docs.find((d) => d.side === "back");
    const nidLocked = Boolean(lockedAt);

    return (
      <section className="space-y-3 border-t border-zinc-200 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}
          >
            {nidStatusLabel(status)}
          </span>
        </div>
        <p className="text-sm text-zinc-600">{hint}</p>
        {nidLocked ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {t("nidLocked")}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {(["front", "back"] as NidDocumentSide[]).map((side) => {
            const doc = side === "front" ? nidFront : nidBack;
            const uploadKey = `${subject}-${side}`;
            return (
              <UploadCard
                key={`${subject}-${side}`}
                required={required}
                title={side === "front" ? t("nidFront") : t("nidBack")}
                hint={t("nidSideHint")}
                accept={NID_ACCEPT}
                disabled={nidLocked}
                uploading={uploading === uploadKey}
                onSelect={(file) => handleNidUpload(side, subject, file)}
              >
                {doc && mounted && authToken ? (
                  <div className="space-y-2">
                    {doc.mimeType.startsWith("image/") ? (
                      <AuthenticatedImage
                        token={authToken}
                        path={nidFileUrl(side, subject)}
                        alt={side === "front" ? t("nidFront") : t("nidBack")}
                        className="h-32 w-full rounded-lg border border-zinc-200 bg-white object-contain"
                      />
                    ) : (
                      <a
                        href="#"
                        onClick={async (e) => {
                          e.preventDefault();
                          const blob = await fetchAuthenticatedBlob(
                            authToken,
                            nidFileUrl(side, subject),
                          );
                          const url = URL.createObjectURL(blob);
                          window.open(url, "_blank");
                          setTimeout(() => URL.revokeObjectURL(url), 60_000);
                        }}
                        className="text-sm font-medium text-rose-700 hover:underline"
                      >
                        {t("viewPdf")}
                      </a>
                    )}
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(doc.status)}`}
                      >
                        {reviewStatusLabel(doc.status)}
                      </span>
                      {!nidLocked ? (
                        <button
                          type="button"
                          disabled={uploading === uploadKey}
                          onClick={() => handleDeleteNid(side, subject)}
                          className="text-sm font-medium text-red-700 hover:underline"
                        >
                          {tc("remove")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </UploadCard>
            );
          })}
        </div>
      </section>
    );
  }

  function nidStatusLabel(status: NidStatus) {
    return t(`nidStatus.${status}`);
  }

  function reviewStatusLabel(status: string) {
    return t(`reviewStatus.${status}`);
  }

  const submitState = media
    ? computeVerificationSubmitState(media)
    : {
        packageComplete: false,
        canResubmit: false,
        isPendingReview: false,
        readyToSubmit: false,
      };
  const {
    packageComplete,
    canResubmit,
    isPendingReview,
    readyToSubmit,
    nidRejected,
  } = submitState;
  const isVerified = Boolean(media?.isVerified);
  const awaitingReview = isPendingReview || (submittedAck && !canResubmit);
  const canSubmitNow =
    readyToSubmit || (canResubmit && !submittedAck);
  const submitDisabled =
    submitting ||
    Boolean(uploading) ||
    isVerified ||
    !packageComplete ||
    !canSubmitNow;

  let submitLabel = t("submitForReview");
  if (submitting) submitLabel = tc("saving");
  else if (isVerified) submitLabel = t("verifiedButton");
  else if (awaitingReview) submitLabel = t("pendingReviewButton");
  else if (canResubmit) submitLabel = t("resubmitForReview");

  const submitButton = (
    <button
      type="button"
      disabled={submitDisabled}
      onClick={handleSubmitForReview}
      className={`w-full rounded-lg px-4 py-3 font-semibold shadow-sm disabled:cursor-not-allowed sm:w-auto ${
        isVerified
          ? "bg-emerald-700 text-white disabled:opacity-100"
          : awaitingReview
            ? "border border-amber-300 bg-amber-50 text-amber-950 disabled:opacity-100"
            : "bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-60"
      }`}
    >
      {submitLabel}
    </button>
  );

  return (
    <div className="space-y-8">
      {cropRequest ? (
        <PhotoCropModal
          file={cropRequest.file}
          aspect={
            cropRequest.type === "primary"
              ? PRIMARY_PHOTO_ASPECT
              : GALLERY_PHOTO_ASPECT
          }
          title={
            cropRequest.type === "primary"
              ? t("crop.primaryTitle")
              : cropRequest.gallerySlot === "family"
                ? t("crop.familyPhotoTitle")
                : t("crop.otherPhotoTitle")
          }
          hint={
            cropRequest.type === "primary"
              ? t("crop.primaryHint")
              : t("crop.galleryHint")
          }
          onCancel={() => setCropRequest(null)}
          onConfirm={handleCropConfirm}
        />
      ) : null}

      {media?.verificationFeedback && (
        <VerificationFeedbackPanel
          feedback={media.verificationFeedback}
          onDismiss={handleDismissAlerts}
          dismissing={dismissingAlerts}
        />
      )}

      {readyToSubmit && (
        <section className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4 sm:p-5">
          <h2 className="text-base font-bold text-rose-950">{t("readyToSubmitTitle")}</h2>
          <p className="mt-1 text-sm text-rose-900">{t("readyToSubmitHint")}</p>
          <div className="mt-4">{submitButton}</div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-zinc-900">{t("photosTitle")}</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(media?.isVerified ? "verified" : "pending")}`}>
            {media?.isVerified
              ? media.verifiedOnBehalf && media.nidVerifiedAt
                ? t("verifiedOnBehalfDualProfile")
                : media.verifiedOnBehalf
                  ? t("verifiedOnBehalfProfile")
                  : t("verifiedProfile")
              : t("unverifiedProfile")}
          </span>
        </div>
        <p className="text-sm text-zinc-600">{t("photosHint")}</p>

        <UploadCard
          required
          title={t("passportPhoto")}
          hint={t("passportPhotoHint")}
          accept={PHOTO_ACCEPT}
          uploading={uploading === "primary"}
          onSelect={(file) => handlePhotoSelected("primary", file)}
        >
          {primaryPhoto && mounted && authToken && (
            <div className="flex flex-wrap items-end gap-4">
              <AuthenticatedImage
                token={authToken}
                path={photoFileUrl(primaryPhoto.id)}
                alt={t("passportPhoto")}
                className="h-40 w-32 rounded-lg border border-zinc-200 object-cover"
              />
              <div className="space-y-2 text-sm">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(primaryPhoto.status)}`}>
                  {reviewStatusLabel(primaryPhoto.status)}
                </span>
                <div>
                  <button
                    type="button"
                    disabled={uploading === primaryPhoto.id}
                    onClick={() => handleDeletePhoto(primaryPhoto)}
                    className="text-sm font-medium text-red-700 hover:underline"
                  >
                    {tc("remove")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </UploadCard>

        <UploadCard
          title={t("otherPhoto")}
          hint={t("otherPhotoHint")}
          accept={PHOTO_ACCEPT}
          disabled={!canAddOther}
          uploading={uploading === "gallery-other"}
          onSelect={(file) => handlePhotoSelected("gallery", file, "other")}
        >
          {otherPhoto && mounted && authToken ? (
            <div className="space-y-2">
              <AuthenticatedImage
                token={authToken}
                path={photoFileUrl(otherPhoto.id)}
                alt={t("otherPhoto")}
                className="aspect-square w-full max-w-xs rounded-lg border border-zinc-200 object-cover"
              />
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  disabled={uploading === otherPhoto.id}
                  onClick={() => handleSetPrimary(otherPhoto)}
                  className="font-medium text-rose-700 hover:underline"
                >
                  {t("setPrimary")}
                </button>
                <button
                  type="button"
                  disabled={uploading === otherPhoto.id}
                  onClick={() => handleDeletePhoto(otherPhoto)}
                  className="font-medium text-red-700 hover:underline"
                >
                  {tc("remove")}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">{t("noOtherPhoto")}</p>
          )}
        </UploadCard>

        <UploadCard
          title={t("familyPhoto")}
          hint={t("familyPhotoHint")}
          accept={PHOTO_ACCEPT}
          disabled={!canAddFamily}
          uploading={uploading === "gallery-family"}
          onSelect={(file) => handlePhotoSelected("gallery", file, "family")}
        >
          {familyPhotos.length > 0 && mounted && authToken ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {familyPhotos.map((photo) => (
                <div key={photo.id} className="space-y-2">
                  <AuthenticatedImage
                    token={authToken}
                    path={photoFileUrl(photo.id)}
                    alt={t("familyPhoto")}
                    className="aspect-square w-full rounded-lg border border-zinc-200 object-cover"
                  />
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      disabled={uploading === photo.id}
                      onClick={() => handleSetPrimary(photo)}
                      className="font-medium text-rose-700 hover:underline"
                    >
                      {t("setPrimary")}
                    </button>
                    <button
                      type="button"
                      disabled={uploading === photo.id}
                      onClick={() => handleDeletePhoto(photo)}
                      className="font-medium text-red-700 hover:underline"
                    >
                      {tc("remove")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">{t("noFamilyPhoto")}</p>
          )}
        </UploadCard>
      </section>

      {onBehalf
        ? renderNidSection({
            subject: "creator",
            title: t("creatorNidTitle"),
            hint: t("creatorNidHint"),
            status: media?.creatorNidStatus ?? "not_submitted",
            lockedAt: media?.creatorNidVerifiedAt,
            required: true,
          })
        : renderNidSection({
            subject: "member",
            title: t("nidTitle"),
            hint: t("nidHint"),
            status: media?.nidStatus ?? "not_submitted",
            lockedAt: media?.nidVerifiedAt,
            required: true,
          })}

      {onBehalf
        ? renderNidSection({
            subject: "member",
            title: t("memberNidTitle"),
            hint: t("memberNidHint"),
            status: media?.nidStatus ?? "not_submitted",
            lockedAt: media?.nidVerifiedAt,
            required: false,
          })
        : null}

      <section className="border-t border-zinc-200 pt-6">
        <p className="text-sm text-zinc-600">{t("autoSaveHint")}</p>
        {media && (
          <ul className="mt-4 space-y-2 text-sm text-zinc-700">
            <li className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{t("biodataReviewLabel")}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(
                  media.profileBiodataReviewStatus ?? "not_submitted",
                )}`}
              >
                {t(
                  `biodataStatus.${media.profileBiodataReviewStatus ?? "not_submitted"}`,
                )}
              </span>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {onBehalf ? t("creatorNidTitle") : t("nidTitle")}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(
                  onBehalf
                    ? (media.creatorNidStatus ?? "not_submitted")
                    : media.nidStatus,
                )}`}
              >
                {nidStatusLabel(
                  onBehalf
                    ? (media.creatorNidStatus ?? "not_submitted")
                    : media.nidStatus,
                )}
              </span>
            </li>
          </ul>
        )}
        <div className="mt-4">{submitButton}</div>
        {nidRejected ? (
          <p className="mt-3 text-sm text-amber-900">{t("submitRejectedNid")}</p>
        ) : null}
      </section>
    </div>
  );
}
