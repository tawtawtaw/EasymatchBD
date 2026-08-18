"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useMounted } from "@/hooks/use-mounted";

type WebcamCaptureModalProps = {
  title: string;
  onCancel: () => void;
  onCapture: (file: File) => void;
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function startCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("unavailable");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}

function snapshotToFile(video: HTMLVideoElement): Promise<File> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    return Promise.reject(new Error("capture"));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("capture"));
  }
  context.drawImage(video, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("capture"));
          return;
        }
        resolve(
          new File([blob], `webcam-${Date.now()}.jpg`, { type: "image/jpeg" }),
        );
      },
      "image/jpeg",
      0.92,
    );
  });
}

function cameraErrorMessage(
  err: unknown,
  t: (key: "permissionDenied" | "unavailable") => string,
) {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return t("permissionDenied");
  }
  return t("unavailable");
}

export function cameraCaptureSupported() {
  return (
    typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function WebcamCaptureModal({
  title,
  onCancel,
  onCapture,
}: WebcamCaptureModalProps) {
  const t = useTranslations("profile.media.camera");
  const mounted = useMounted();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturing, setCapturing] = useState(false);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setCapturedFile(null);
  }, []);

  const attachStream = useCallback(async () => {
    setError(null);
    setReady(false);
    setStarting(true);
    stopStream(streamRef.current);
    streamRef.current = null;

    try {
      const stream = await startCamera();
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopStream(stream);
        streamRef.current = null;
        setError(t("unavailable"));
        return;
      }
      video.srcObject = stream;
      await video.play();
      if (video.readyState >= 2 && video.videoWidth > 0) {
        setReady(true);
      }
    } catch (err) {
      setError(cameraErrorMessage(err, t));
    } finally {
      setStarting(false);
    }
  }, [t]);

  useEffect(() => {
    if (!mounted || capturedFile) return;

    const frame = window.requestAnimationFrame(() => {
      void attachStream();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [attachStream, capturedFile, mounted]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      stopStream(streamRef.current);
    };
  }, []);

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || capturing || !ready) return;
    setCapturing(true);
    setError(null);
    try {
      const file = await snapshotToFile(video);
      stopStream(streamRef.current);
      streamRef.current = null;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setCapturedFile(file);
      setPreviewUrl(url);
      setReady(false);
    } catch {
      setError(t("captureFailed"));
    } finally {
      setCapturing(false);
    }
  }

  function handleRetake() {
    clearPreview();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="webcam-capture-title"
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
      >
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 id="webcam-capture-title" className="text-lg font-semibold text-zinc-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{t("hint")}</p>
        </div>

        <div className="relative bg-zinc-950">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="mx-auto max-h-[60vh] w-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                if (videoRef.current && videoRef.current.videoWidth > 0) {
                  setReady(true);
                  setStarting(false);
                }
              }}
              className="mx-auto max-h-[60vh] w-full bg-black object-contain"
            />
          )}
          {starting && !previewUrl && !error ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white">
              {t("starting")}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="px-4 py-2 text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            {t("cancel")}
          </button>
          {capturedFile ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                {t("retake")}
              </button>
              <button
                type="button"
                onClick={() => onCapture(capturedFile)}
                className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800"
              >
                {t("usePhoto")}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!ready || capturing}
              onClick={() => void handleCapture()}
              className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
            >
              {capturing ? t("capturing") : t("capture")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
