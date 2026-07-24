import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import type { CaptureOutcome } from "../lib/media-capture";
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
    notReady: "ক্যামেরা এখনো প্রস্তুত নয়। একটু অপেক্ষা করে আবার চেষ্টা করুন।",
    captureFailed: "ছবি তোলা যায়নি। আবার চেষ্টা করুন।",
  },
} as const;

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

  const finish = useCallback((outcome: CaptureOutcome) => {
    requestRef.current?.resolve(outcome);
    requestRef.current = null;
    setRequest(null);
    setCameraReady(false);
    setCapturing(false);
  }, []);

  const handleHostRequest = useCallback((next: CameraCaptureRequest) => {
    requestRef.current = next;
    setCameraReady(false);
    setCapturing(false);
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

  async function handleCapture() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: requestRef.current?.options?.quality ?? 0.85,
        skipProcessing: false,
      });
      if (!photo?.uri) {
        finish({ status: "error", message: copy.captureFailed });
        return;
      }
      const name = requestRef.current?.fallbackName ?? `photo-${Date.now()}.jpg`;
      finish({
        status: "success",
        file: {
          uri: photo.uri,
          name,
          type: "image/jpeg",
          fileSize: undefined,
        },
      });
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
              onCameraReady={() => setCameraReady(true)}
            />
            {!cameraReady ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={colors.white} size="large" />
                <Text style={styles.loadingText}>{copy.loading}</Text>
              </View>
            ) : null}
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
});
