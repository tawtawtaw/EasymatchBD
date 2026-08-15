import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "../services/api/client";
import { ensureLocalPhoto } from "../lib/photo-cache";
import { colors } from "../theme/colors";

type Props = {
  path: string;
  style?: object;
  loadingLabel?: string;
  previewUri?: string | null;
  onError?: () => void;
};

export function AuthenticatedImage({
  path,
  style,
  loadingLabel = "Loading…",
  previewUri,
  onError,
}: Props) {
  const remoteUri = `${API_BASE_URL}${path}`;
  const [localUri, setLocalUri] = useState<string | null>(previewUri ?? null);
  const [failed, setFailed] = useState(false);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (previewUri) {
        setLocalUri(previewUri);
        setFailed(false);
      } else {
        setLocalUri(null);
        setFailed(false);
      }
      try {
        const uri = await ensureLocalPhoto(remoteUri, path);
        if (!cancelled) setLocalUri(uri);
      } catch {
        if (cancelled) return;
        if (previewUri) {
          setLocalUri(previewUri);
          setFailed(false);
          return;
        }
        setFailed(true);
        onErrorRef.current?.();
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [path, remoteUri, previewUri]);

  if (failed) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>Unavailable</Text>
      </View>
    );
  }

  if (!localUri) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>{loadingLabel}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: localUri }}
      style={[styles.image, style]}
      resizeMode="cover"
      onError={() => {
        if (previewUri) {
          setLocalUri(previewUri);
          setFailed(false);
          return;
        }
        setFailed(true);
        onErrorRef.current?.();
      }}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.rose100,
  },
  placeholder: {
    backgroundColor: colors.rose100,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 11,
    color: colors.zinc500,
  },
});
