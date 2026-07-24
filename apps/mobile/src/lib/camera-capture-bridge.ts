import type { CaptureOutcome, ImageCaptureOptions } from "./media-capture";

export type CameraFacing = "front" | "back";

export type CameraCaptureRequest = {
  fallbackName: string;
  options?: ImageCaptureOptions;
  facing?: CameraFacing;
  resolve: (outcome: CaptureOutcome) => void;
};

type HostHandler = (request: CameraCaptureRequest) => void;

let hostHandler: HostHandler | null = null;

export function registerCameraCaptureHost(handler: HostHandler | null) {
  hostHandler = handler;
}

export function requestInAppCameraCapture(
  fallbackName: string,
  options?: ImageCaptureOptions,
  facing: CameraFacing = "back",
): Promise<CaptureOutcome> {
  return new Promise((resolve) => {
    if (!hostHandler) {
      resolve({ status: "unavailable" });
      return;
    }
    hostHandler({ fallbackName, options, facing, resolve });
  });
}
