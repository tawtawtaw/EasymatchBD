"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area, type Point } from "react-easy-crop";
import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { useMounted } from "@/hooks/use-mounted";
import {
  getCroppedPhotoFile,
  readFileAsObjectUrl,
} from "@/lib/photo-crop";

type CropperProps = {
  image: string;
  crop: Point;
  zoom: number;
  aspect: number;
  onCropChange: (location: Point) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  objectFit?: "contain" | "cover" | "horizontal-cover" | "vertical-cover";
};

const CropperComponent = Cropper as unknown as ComponentType<CropperProps>;

type PhotoCropModalProps = {
  file: File;
  aspect: number;
  title: string;
  hint: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

export function PhotoCropModal({
  file,
  aspect,
  title,
  hint,
  onCancel,
  onConfirm,
}: PhotoCropModalProps) {
  const t = useTranslations("profile.media.crop");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readFileAsObjectUrl(file)
      .then((src) => {
        if (!cancelled) setImageSrc(src);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [file, t]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleUseOriginal() {
    setProcessing(true);
    setError(null);
    try {
      onConfirm(file);
    } finally {
      setProcessing(false);
    }
  }

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    setError(null);
    try {
      const cropped = await getCroppedPhotoFile(imageSrc, croppedAreaPixels, file.name);
      onConfirm(cropped);
    } catch {
      setError(t("exportError"));
    } finally {
      setProcessing(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-crop-title"
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
      >
        <header className="border-b border-zinc-200 px-4 py-4 sm:px-5">
          <h2 id="photo-crop-title" className="text-lg font-bold text-zinc-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{hint}</p>
        </header>

        <div className="relative h-[min(52vh,420px)] bg-zinc-900">
          {imageSrc ? (
            <CropperComponent
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-300">
              {error ?? tc("loading")}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-zinc-200 px-4 py-4 sm:px-5">
          <label className="block text-sm font-medium text-zinc-700">
            {t("zoomLabel")}
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="mt-2 w-full accent-rose-700"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {tc("cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleUseOriginal()}
              disabled={processing || !imageSrc}
              className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
            >
              {processing ? tc("loading") : t("useOriginalPhoto")}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={processing || !imageSrc || !croppedAreaPixels}
              className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              {processing ? tc("loading") : t("useCroppedPhoto")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
