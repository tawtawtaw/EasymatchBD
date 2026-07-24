import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { requestInAppCameraCapture, type CameraFacing } from "./camera-capture-bridge";

export type PickedMediaFile = {
  uri: string;
  name: string;
  type: string;
  fileSize?: number;
};

export type ImageCaptureOptions = {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  facing?: CameraFacing;
};

export type CaptureOutcome =
  | { status: "success"; file: PickedMediaFile }
  | { status: "cancelled" }
  | { status: "permission_denied"; canOpenSettings?: boolean }
  | { status: "unavailable" }
  | { status: "error"; message: string };

type PermissionResult = {
  granted: boolean;
  canOpenSettings?: boolean;
};

async function ensureCameraPermission(): Promise<PermissionResult> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return { granted: true };
  const requested = await ImagePicker.requestCameraPermissionsAsync();
  return {
    granted: requested.granted,
    canOpenSettings: requested.granted ? undefined : !requested.canAskAgain,
  };
}

async function ensureLibraryPermission(): Promise<PermissionResult> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return { granted: true };
  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return {
    granted: requested.granted,
    canOpenSettings: requested.granted ? undefined : !requested.canAskAgain,
  };
}

function assetToFile(
  asset: ImagePicker.ImagePickerAsset,
  fallbackName: string,
): PickedMediaFile {
  return {
    uri: asset.uri,
    name: asset.fileName ?? fallbackName,
    type: asset.mimeType ?? "image/jpeg",
    fileSize: asset.fileSize,
  };
}

async function captureWithSystemCamera(
  fallbackName: string,
  options: ImageCaptureOptions,
): Promise<CaptureOutcome> {
  const permission = await ensureCameraPermission();
  if (!permission.granted) {
    return {
      status: "permission_denied",
      canOpenSettings: permission.canOpenSettings,
    };
  }

  if (!ImagePicker.launchCameraAsync) {
    return { status: "unavailable" };
  }

  try {
    const useCrop = Platform.OS === "ios" && (options.allowsEditing ?? false);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: options.quality ?? 0.85,
      allowsEditing: useCrop,
      aspect: useCrop ? options.aspect : undefined,
      cameraType:
        options.facing === "front"
          ? ImagePicker.CameraType.front
          : ImagePicker.CameraType.back,
    });

    if (!result.canceled && result.assets[0]) {
      return {
        status: "success",
        file: assetToFile(result.assets[0], fallbackName),
      };
    }

    const pending = await ImagePicker.getPendingResultAsync();
    if (
      pending &&
      "assets" in pending &&
      !pending.canceled &&
      pending.assets?.[0]
    ) {
      return {
        status: "success",
        file: assetToFile(pending.assets[0], fallbackName),
      };
    }

    return { status: "cancelled" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not open the camera.";
    return { status: "error", message };
  }
}

export async function captureImageFromCamera(
  fallbackName: string,
  options: ImageCaptureOptions = {},
): Promise<CaptureOutcome> {
  if (Platform.OS !== "web") {
    const inApp = await requestInAppCameraCapture(
      fallbackName,
      options,
      options.facing ?? "back",
    );
    if (inApp.status !== "unavailable") {
      return inApp;
    }
  }

  return captureWithSystemCamera(fallbackName, options);
}

export async function pickImageFromLibrary(
  fallbackName: string,
  options: ImageCaptureOptions = {},
): Promise<CaptureOutcome> {
  const permission = await ensureLibraryPermission();
  if (!permission.granted) {
    return {
      status: "permission_denied",
      canOpenSettings: permission.canOpenSettings,
    };
  }

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: options.quality ?? 0.85,
      allowsEditing: options.allowsEditing ?? false,
      aspect: options.aspect,
    });

    if (result.canceled || !result.assets[0]) return { status: "cancelled" };
    return {
      status: "success",
      file: assetToFile(result.assets[0], fallbackName),
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not open the photo library.";
    return { status: "error", message };
  }
}

export async function pickDocumentFile(): Promise<PickedMediaFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name ?? `document-${Date.now()}`,
    type: asset.mimeType ?? "application/octet-stream",
    fileSize: asset.size,
  };
}
