"use client";

import { FormEvent, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminBiodataEditForm } from "@/components/AdminBiodataEditForm";
import { FieldLabel } from "@/components/FieldLabel";
import type { DropdownMap } from "@/lib/api";
import {
  createStaffAssistedProfile,
  deleteStaffAssistedNid,
  deleteStaffAssistedPhoto,
  submitStaffAssistedProfile,
  uploadStaffAssistedNid,
  uploadStaffAssistedPhoto,
} from "@/lib/staff-assisted";
import {
  getVerificationSubmission,
  type VerificationSubmission,
} from "@/lib/verification";

function DocumentFilePicker({
  label,
  accept,
  disabled,
  busy,
  chooseLabel,
  busyLabel,
  uploadedLabel,
  removeLabel,
  isUploaded,
  removing,
  onFile,
  onRemove,
}: {
  label: string;
  accept: string;
  disabled: boolean;
  busy: boolean;
  chooseLabel: string;
  busyLabel: string;
  uploadedLabel: string;
  removeLabel: string;
  isUploaded: boolean;
  removing: boolean;
  onFile: (file: File | null) => void;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <div className="block space-y-1.5 text-sm">
      <FieldLabel required>{label}</FieldLabel>
      {isUploaded ? (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="text-sm font-semibold text-emerald-900">{uploadedLabel}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-sky-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? busyLabel : chooseLabel}
            </button>
            {onRemove ? (
              <button
                type="button"
                disabled={disabled || removing}
                onClick={onRemove}
                className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removing ? busyLabel : removeLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex w-full items-center justify-center rounded-lg bg-sky-800 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? busyLabel : chooseLabel}
        </button>
      )}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}

type StaffAssistedIntakePanelProps = {
  token: string;
  dropdowns: DropdownMap;
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
  onCreated?: (submission: VerificationSubmission) => void;
};

export function StaffAssistedIntakePanel({
  token,
  dropdowns,
  onError,
  onMessage,
  onCreated,
}: StaffAssistedIntakePanelProps) {
  const t = useTranslations("verification.staffAssisted");
  const tc = useTranslations("common");
  const tp = useTranslations("profile");
  const tMissing = useTranslations("profile.completionChecklist.items");

  const [phone, setPhone] = useState("");
  const [consentNote, setConsentNote] = useState("");
  const [consentChannel, setConsentChannel] = useState("in_person");
  const [creating, setCreating] = useState(false);
  const [submission, setSubmission] = useState<VerificationSubmission | null>(
    null,
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function resetForAnother() {
    setPhone("");
    setConsentNote("");
    setConsentChannel("in_person");
    setSubmission(null);
    setDone(false);
    setUploading(null);
    setRemoving(null);
    setSubmitting(false);
    onError(null);
    onMessage(null);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    onError(null);
    setCreating(true);
    setDone(false);
    try {
      const created = await createStaffAssistedProfile(token, {
        phone,
        consentNote,
        consentChannel,
      });
      setSubmission(created);
      onMessage(t("created"));
      onCreated?.(created);
    } catch (err) {
      onError(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function refreshSubmission(profileId: string) {
    const next = await getVerificationSubmission(token, profileId);
    setSubmission(next);
    return next;
  }

  async function handleUploadPhoto(file: File | null) {
    if (!file || !submission || done) return;
    onError(null);
    setUploading("photo");
    try {
      await uploadStaffAssistedPhoto(
        token,
        submission.profileId,
        file,
        "primary",
      );
      await refreshSubmission(submission.profileId);
      onMessage(t("photoUploaded"));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploading(null);
    }
  }

  async function handleUploadNid(side: "front" | "back", file: File | null) {
    if (!file || !submission || done) return;
    onError(null);
    setUploading(`nid-${side}`);
    try {
      await uploadStaffAssistedNid(token, submission.profileId, file, side);
      await refreshSubmission(submission.profileId);
      onMessage(t("nidUploaded"));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploading(null);
    }
  }

  async function handleRemovePhoto(photoId: string) {
    if (!submission || done) return;
    onError(null);
    setRemoving(`photo-${photoId}`);
    try {
      await deleteStaffAssistedPhoto(token, submission.profileId, photoId);
      await refreshSubmission(submission.profileId);
      onMessage(t("photoRemoved"));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("removeFailed"));
    } finally {
      setRemoving(null);
    }
  }

  async function handleRemoveNid(side: "front" | "back") {
    if (!submission || done) return;
    onError(null);
    setRemoving(`nid-${side}`);
    try {
      await deleteStaffAssistedNid(token, submission.profileId, side);
      await refreshSubmission(submission.profileId);
      onMessage(t("nidRemoved"));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("removeFailed"));
    } finally {
      setRemoving(null);
    }
  }

  async function handleSubmit() {
    if (!submission || done) return;
    onError(null);
    setSubmitting(true);
    try {
      await submitStaffAssistedProfile(token, submission.profileId);
      await refreshSubmission(submission.profileId);
      setDone(true);
      onMessage(t("submitted"));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const photos = submission?.photos ?? [];
  const nidDocuments = submission?.nidDocuments ?? [];
  const photoCount = photos.length;
  const nidCount = nidDocuments.length;
  const primaryPhoto =
    photos.find((photo) => photo.type === "primary") ?? photos[0] ?? null;
  const nidFront = nidDocuments.find(
    (doc) => doc.side === "front" && doc.subject === "member",
  );
  const nidBack = nidDocuments.find(
    (doc) => doc.side === "back" && doc.subject === "member",
  );
  const docsBusy = uploading !== null || removing !== null;
  const completionMissing = submission?.completionMissing ?? [];

  function missingFieldLabel(key: string) {
    try {
      return tMissing(key as Parameters<typeof tMissing>[0]);
    } catch {
      return key;
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-sky-200 bg-white p-4 text-zinc-950">
      <div>
        <h2 className="text-base font-bold text-sky-950">{t("title")}</h2>
        <p className="mt-1 text-sm text-zinc-700">{t("hint")}</p>
      </div>

      {!submission ? (
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
          <p className="md:col-span-2 text-xs text-zinc-600">
            {tp("requiredLegend")}
          </p>
          <label className="block space-y-1.5">
            <FieldLabel required>{t("phone")}</FieldLabel>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="field-input bg-white text-zinc-950"
              placeholder="01XXXXXXXXX"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <FieldLabel required>{t("consentChannel")}</FieldLabel>
            <select
              value={consentChannel}
              onChange={(e) => setConsentChannel(e.target.value)}
              className="field-input bg-white text-zinc-950"
              required
            >
              <option value="in_person" className="bg-white text-zinc-950">
                {t("channels.in_person")}
              </option>
              <option value="whatsapp" className="bg-white text-zinc-950">
                {t("channels.whatsapp")}
              </option>
              <option value="phone_call" className="bg-white text-zinc-950">
                {t("channels.phone_call")}
              </option>
              <option value="written_form" className="bg-white text-zinc-950">
                {t("channels.written_form")}
              </option>
            </select>
          </label>
          <label className="md:col-span-2 block space-y-1.5">
            <FieldLabel required>{t("consentNote")}</FieldLabel>
            <textarea
              value={consentNote}
              onChange={(e) => setConsentNote(e.target.value)}
              className="field-input bg-white text-zinc-950"
              rows={3}
              required
              minLength={3}
              placeholder={t("consentNotePlaceholder")}
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creating ? t("creating") : t("create")}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-2 rounded-lg border border-sky-200 bg-white p-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-zinc-500">{t("profileCode")}</dt>
              <dd className="font-semibold">{submission.profileCode}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t("phone")}</dt>
              <dd className="font-semibold">{submission.phone}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-zinc-500">{t("consentNote")}</dt>
              <dd className="font-semibold">{submission.consentNote || "—"}</dd>
            </div>
          </dl>

          {!done ? (
            <AdminBiodataEditForm
              key={submission.profileId}
              token={token}
              submission={submission}
              dropdowns={dropdowns}
              variant="intake"
              onError={onError}
              onSaved={(next) => {
                setSubmission(next);
                onMessage(t("biodataSaved"));
              }}
            />
          ) : null}

          <div className="grid gap-3 rounded-lg border border-sky-200 bg-sky-50/40 p-3 md:grid-cols-3">
            <p className="md:col-span-3 text-sm font-semibold text-sky-950">
              {t("documentsTitle")}
            </p>
            <p className="md:col-span-3 text-xs text-zinc-600">
              {tp("requiredLegend")}
            </p>
            <DocumentFilePicker
              label={t("primaryPhoto")}
              accept="image/*"
              disabled={done || docsBusy}
              busy={uploading === "photo"}
              chooseLabel={t("chooseFile")}
              busyLabel={tc("loading")}
              uploadedLabel={t("uploaded")}
              removeLabel={tc("remove")}
              isUploaded={Boolean(primaryPhoto)}
              removing={
                primaryPhoto
                  ? removing === `photo-${primaryPhoto.id}`
                  : false
              }
              onFile={(file) => void handleUploadPhoto(file)}
              onRemove={
                primaryPhoto
                  ? () => void handleRemovePhoto(primaryPhoto.id)
                  : undefined
              }
            />
            <DocumentFilePicker
              label={t("nidFront")}
              accept="image/*,application/pdf"
              disabled={done || docsBusy}
              busy={uploading === "nid-front"}
              chooseLabel={t("chooseFile")}
              busyLabel={tc("loading")}
              uploadedLabel={t("uploaded")}
              removeLabel={tc("remove")}
              isUploaded={Boolean(nidFront)}
              removing={removing === "nid-front"}
              onFile={(file) => void handleUploadNid("front", file)}
              onRemove={
                nidFront ? () => void handleRemoveNid("front") : undefined
              }
            />
            <DocumentFilePicker
              label={t("nidBack")}
              accept="image/*,application/pdf"
              disabled={done || docsBusy}
              busy={uploading === "nid-back"}
              chooseLabel={t("chooseFile")}
              busyLabel={tc("loading")}
              uploadedLabel={t("uploaded")}
              removeLabel={tc("remove")}
              isUploaded={Boolean(nidBack)}
              removing={removing === "nid-back"}
              onFile={(file) => void handleUploadNid("back", file)}
              onRemove={
                nidBack ? () => void handleRemoveNid("back") : undefined
              }
            />
            {docsBusy ? (
              <p className="md:col-span-3 text-xs text-zinc-600">
                {tc("loading")}
              </p>
            ) : null}
            <p className="md:col-span-3 text-xs text-zinc-600">
              {t("mediaCounts", {
                photos: photoCount,
                nid: nidCount,
              })}
            </p>
          </div>

          {!done && completionMissing.length > 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">{t("missingFieldsTitle")}</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {completionMissing.map((key) => (
                  <li key={key}>{missingFieldLabel(key)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!done ? (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || completionMissing.length > 0}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? t("submitting") : t("submit")}
              </button>
            ) : (
              <button
                type="button"
                onClick={resetForAnother}
                className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white"
              >
                {t("createAnother")}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
