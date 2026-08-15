import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  registerCameraCaptureHost,
  type CameraCaptureRequest,
} from "../lib/camera-capture-bridge";
import type { CaptureOutcome, PickedMediaFile } from "../lib/media-capture";
import { persistLocalMediaFile } from "../lib/media-capture";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";

const cameraCopy = {
  en: {
    loading: "Opening camera…",
    permissionTitle: "Camera access needed",
    permissionBody: "Allow camera access to take profile and NID photos.",
    grant: "Allow camera",
    cancel: "Cancel",
    capture: "Capture",
    usePhoto: "Use this photo",
    retake: "Retake",
    reviewTitle: "Check this photo",
    reviewHint: "Make sure it is clear before you save it to your profile.",
    notReady: "Camera is not ready yet. Wait a moment and try again.",
    captureFailed: "Could not take photo. Try again.",
  },
  bn: {
    loading: "ক্যামেরা খোলা হচ্ছে…",
    permissionTitle: "ক্যামেরার অনুমতি প্রয়োজন",
    permissionBody: "প্রোফাইল ও এনআইডি ছবি তুলতে ক্যামেরার অনুমতি দিন।",
    grant: "অনুমতি দিন",
    cancel: "বাতিল",
    capture: "ছবি তুলুন",
    usePhoto: "এই ছবি ব্যবহার করুন",
    retake: "আবার তুলুন",
    reviewTitle: "ছবিটি দেখে নিন",
    reviewHint: "প্রোফাইলে সেভ করার আগে ছবিটি স্পষ্ট কিনা দেখুন।",
    notReady: "ক্যামেরা এখনো প্রস্তুত নয়। একটু অপেক্ষা করে আবার চেষ্টা করুন।",
    captureFailed: "ছবি তোলা যায়নি। আবার চেষ্টা করুন।",
  },
} as const;

function pickUploadPictureSize(sizes: string[]): string | undefined {
  const parsed = sizes
    .map((value) => {
      const match = /^(\d+)\s*x\s*(\d+)$/i.exec(value.trim());
      if (!match) return null;
      const width = Number(match[1]);
      const height = Number(match[2]);
      return {
        value,
        maxEdge: Math.max(width, height),
        pixels: width * height,
      };
    })
    .filter((item): item is { value: string; maxEdge: number; pixels: number } => item != null);
  if (!parsed.length) return undefined;
  const preferred = parsed.filter((item) => item.maxEdge >= 720 && item.maxEdge <= 1600);
  const pool = preferred.length
    ? preferred
    : parsed.filter((item) => item.maxEdge <= 1920);
  return (pool.length ? pool : parsed).sort((a, b) => b.pixels - a.pixels)[0]?.value;
}

export function CameraCaptureHost() {
  const locale = useLocaleStore((s) => s.locale);
  const copy = cameraCopy[locale];
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const requestRef = useRef<CameraCaptureRequest | null>(null);
  const [request, setRequest] = useState<CameraCaptureRequest | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const [captured, setCaptured] = useState<PickedMediaFile | null>(null);

  const finish = useCallback((outcome: CaptureOutcome) => {
    requestRef.current?.resolve(outcome);
    requestRef.current = null;
    setRequest(null);
    setCameraReady(false);
    setCapturing(false);
    setCaptured(null);
  }, []);

  const handleHostRequest = useCallback((next: CameraCaptureRequest) => {
    requestRef.current = next;
    setCameraReady(false);
    setCapturing(false);
    setCaptured(null);
    setPictureSize(undefined);
    setRequest(next);
  }, []);

  useEffect(() => {
    registerCameraCaptureHost(handleHostRequest);
    return () => registerCameraCaptureHost(null);
  }, [handleHostRequest]);

  async function handleGrantPermission() {
    const result = await requestPermission();
    if (!result.granted) {
      finish({ status: "permission_denied", canOpenSettings: !result.canAskAgain });
    }
  }

  async function handleCameraReady() {
    try {
      if (!pictureSize) {
        const sizes = await cameraRef.current?.getAvailablePictureSizesAsync();
        const picked = pickUploadPictureSize(sizes ?? []);
        if (picked) setPictureSize(picked);
      }
    } catch {
      // Keep the device default if size discovery fails.
    }
    setCameraReady(true);
  }

  async function handleCapture() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: requestRef.current?.options?.quality ?? 0.45,
        skipProcessing: false,
        exif: false,
        shutterSound: false,
      });
      if (!photo?.uri) {
        finish({ status: "error", message: copy.captureFailed });
        return;
      }
      const name = requestRef.current?.fallbackName ?? `photo-${Date.now()}.jpg`;
      const persisted = await persistLocalMediaFile({
        uri: photo.uri,
        name,
        type: "image/jpeg",
        fileSize: undefined,
      });
      setCaptured(persisted);
      setCapturing(false);
    } catch {
      finish({ status: "error", message: copy.captureFailed });
    }
  }

  const visible = request !== null;
  const permissionLoading = visible && permission === null;
  const needsPermission = visible && permission !== null && !permission.granted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => finish({ status: "cancelled" })}>
      <View style={styles.root}>
        {permissionLoading ? (
          <View style={[styles.permissionBox, { paddingTop: insets.top + 24 }]}>
            <ActivityIndicator color={colors.rose800} size="large" />
            <Text style={styles.permissionBody}>{copy.loading}</Text>
          </View>
        ) : needsPermission ? (
          <View style={[styles.permissionBox, { paddingTop: insets.top + 24 }]}>
            <Text style={styles.permissionTitle}>{copy.permissionTitle}</Text>
            <Text style={styles.permissionBody}>{copy.permissionBody}</Text>
            <Pressable style={styles.primaryButton} onPress={() => void handleGrantPermission()}>
              <Text style={styles.primaryText}>{copy.grant}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => finish({ status: "cancelled" })}
            >
              <Text style={styles.secondaryText}>{copy.cancel}</Text>
            </Pressable>
          </View>
        ) : visible ? (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={request?.facing ?? "back"}
              mode="picture"
              pictureSize={pictureSize}
              onCameraReady={() => void handleCameraReady()}
            />
            {!cameraReady && !captured ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={colors.white} size="large" />
                <Text style={styles.loadingText}>{copy.loading}</Text>
              </View>
            ) : null}
            {captured ? (
              <View style={styles.reviewOverlay}>
                <Image source={{ uri: captured.uri }} style={styles.reviewImage} resizeMode="contain" />
                <View style={[styles.reviewActions, { paddingBottom: insets.bottom + 16 }]}>
                  <Text style={styles.reviewTitle}>{copy.reviewTitle}</Text>
                  <Text style={styles.reviewHint}>{copy.reviewHint}</Text>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => finish({ status: "success", file: captured })}
                  >
                    <Text style={styles.primaryText}>{copy.usePhoto}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => {
                      setCaptured(null);
                      setCapturing(false);
                    }}
                  >
                    <Text style={styles.secondaryText}>{copy.retake}</Text>
                  </Pressable>
                  <Pressable onPress={() => finish({ status: "cancelled" })}>
                    <Text style={styles.cancelText}>{copy.cancel}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable
                  style={styles.cancelChip}
                  onPress={() => finish({ status: "cancelled" })}
                  disabled={capturing}
                >
                  <Text style={styles.cancelText}>{copy.cancel}</Text>
                </Pressable>
                <Pressable
                  style={[styles.shutter, capturing && styles.shutterDisabled]}
                  onPress={() => void handleCapture()}
                  disabled={!cameraReady || capturing}
                >
                  <View style={styles.shutterInner} />
                </Pressable>
                <View style={styles.sideSpacer} />
              </View>
            )}
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.zinc900,
  },
  permissionBox: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 16,
    backgroundColor: colors.white,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.rose900,
  },
  permissionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.zinc600,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.rose800,
    fontWeight: "700",
    fontSize: 15,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    gap: 12,
  },
  loadingText: {
    color: colors.white,
    fontSize: 15,
  },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  cancelChip: {
    minWidth: 72,
    paddingVertical: 8,
  },
  cancelText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 15,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
  },
  sideSpacer: {
    minWidth: 72,
  },
  reviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.zinc900,
  },
  reviewImage: {
    flex: 1,
    width: "100%",
  },
  reviewActions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    backgroundColor: colors.zinc900,
  },
  reviewTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  reviewHint: {
    color: "#e4e4e7",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
});
