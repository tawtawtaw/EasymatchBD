import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
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

export function withFileScheme(uri: string) {
  if (
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("ph://") ||
    uri.startsWith("assets-library://")
  ) {
    return uri;
  }
  return `file://${uri}`;
}

export function normalizeUploadMime(type: string | undefined, name: string) {
  const mime = (type ?? "").toLowerCase().trim();
  if (mime === "image/jpg" || mime === "image/pjpeg" || mime === "image/jpeg") {
    return "image/jpeg";
  }
  if (mime === "image/png" || mime === "image/webp" || mime === "application/pdf") {
    return mime;
  }
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  if (/\.pdf$/i.test(name)) return "application/pdf";
  return "image/jpeg";
}

function safeFileName(name: string, mimeType: string) {
  const cleaned = name.replace(/[^\w.-]+/g, "_") || `photo-${Date.now()}`;
  if (/\.(jpe?g|png|webp|pdf)$/i.test(cleaned)) return cleaned;
  if (mimeType.includes("png")) return `${cleaned}.png`;
  if (mimeType.includes("webp")) return `${cleaned}.webp`;
  if (mimeType.includes("pdf")) return `${cleaned}.pdf`;
  return `${cleaned}.jpg`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(withFileScheme(uri));
    if (info.exists && !info.isDirectory) return info.size;
  } catch {
    // ignore missing/unreadable files
  }
  return 0;
}

async function waitForFileSize(uri: string, attempts = 8): Promise<number> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const size = await getFileSize(uri);
    if (size > 0) return size;
    await delay(60);
  }
  return 0;
}

async function copyToStableLocation(source: string, destination: string) {
  try {
    await FileSystem.copyAsync({ from: source, to: destination });
    if ((await getFileSize(destination)) > 0) return;
  } catch {
    // fall through to a base64 copy, which works for some camera URIs copyAsync rejects
  }

  const contents = await FileSystem.readAsStringAsync(source, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await FileSystem.writeAsStringAsync(destination, contents, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/** Copy camera/gallery files into app documents so Android upload is not a deleted temp URI. */
export async function persistLocalMediaFile(
  file: PickedMediaFile,
): Promise<PickedMediaFile> {
  const stagingRoot =
    FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!stagingRoot) return file;

  const type = normalizeUploadMime(file.type, file.name);
  const name = safeFileName(file.name, type);
  const source = withFileScheme(file.uri);

  if (source.includes("upload-staging/")) {
    const existingSize = await getFileSize(source);
    if (existingSize > 0) {
      return { uri: source, name, type, fileSize: existingSize };
    }
  }

  const stagingDir = `${stagingRoot}upload-staging/`;
  await FileSystem.makeDirectoryAsync(stagingDir, { intermediates: true });
  const destination = `${stagingDir}upload-${Date.now()}-${name}`;

  await waitForFileSize(source);
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await copyToStableLocation(source, destination);
      const size = await getFileSize(destination);
      if (size > 0) {
        return { uri: destination, name, type, fileSize: size };
      }
    } catch (error) {
      lastError = error;
    }
    await delay(80);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not save the photo for upload. Please take it again.");
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
      quality: options.quality ?? 0.45,
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
        file: await persistLocalMediaFile(assetToFile(result.assets[0], fallbackName)),
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
        file: await persistLocalMediaFile(assetToFile(pending.assets[0], fallbackName)),
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
      quality: options.quality ?? 0.45,
      allowsEditing: options.allowsEditing ?? false,
      aspect: options.aspect,
    });

    if (result.canceled || !result.assets[0]) return { status: "cancelled" };
    return {
      status: "success",
      file: await persistLocalMediaFile(assetToFile(result.assets[0], fallbackName)),
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
