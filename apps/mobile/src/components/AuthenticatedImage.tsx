import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "../services/api/client";
import { sessionStorage } from "../services/session-storage";
import { colors } from "../theme/colors";

type Props = {
  path: string;
  style?: object;
  loadingLabel?: string;
  onError?: () => void;
};

function cacheFileForPath(path: string) {
  const safe = path.replace(/[^\w.-]+/g, "_");
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  return `${base}auth-image-${safe}`;
}

export function AuthenticatedImage({
  path,
  style,
  loadingLabel = "Loading…",
  onError,
}: Props) {
  const remoteUri = `${API_BASE_URL}${path}`;
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLocalUri(null);
      setFailed(false);

      try {
        const token = await sessionStorage.getAccessToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        const cacheFile = cacheFileForPath(path);
        const result = await FileSystem.downloadAsync(remoteUri, cacheFile, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;

        if (result.status !== 200) {
          throw new Error(`Image request failed (${result.status})`);
        }

        setLocalUri(result.uri);
      } catch {
        if (cancelled) return;
        setFailed(true);
        onErrorRef.current?.();
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [path, remoteUri]);

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
