import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ensureLocalPhoto, photoCacheKey, prefetchPhotos } from "../lib/photo-cache";
import { colors } from "../theme/colors";

export type GalleryPhoto = {
  id: string;
  remoteUri: string;
  profileId: string;
};

type Props = {
  visible: boolean;
  photos: GalleryPhoto[];
  initialIndex: number;
  closeLabel: string;
  confidentialNotice: string;
  loadingLabel: string;
  counterLabel: (current: number, total: number) => string;
  onClose: () => void;
};

function PhotoPage({
  photo,
  width,
  height,
  loadingLabel,
}: {
  photo: GalleryPhoto;
  width: number;
  height: number;
  loadingLabel: string;
}) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLocalUri(null);
    setFailed(false);
    void ensureLocalPhoto(
      photo.remoteUri,
      photoCacheKey(photo.profileId, photo.id, "display"),
    )
      .then((uri) => {
        if (!cancelled) setLocalUri(uri);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [photo.id, photo.profileId, photo.remoteUri]);

  return (
    <View style={[styles.page, { width, height }]}>
      {localUri ? (
        <Image
          source={{ uri: localUri }}
          style={styles.fullImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.placeholder}>
          {failed ? (
            <Text style={styles.placeholderText}>—</Text>
          ) : (
            <>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.placeholderText}>{loadingLabel}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

export function PhotoGalleryModal({
  visible,
  photos,
  initialIndex,
  closeLabel,
  confidentialNotice,
  loadingLabel,
  counterLabel,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    const neighbors = [initialIndex - 1, initialIndex, initialIndex + 1]
      .filter((i) => i >= 0 && i < photos.length)
      .map((i) => photos[i]);
    prefetchPhotos(
      neighbors.map((photo) => ({
        remoteUri: photo.remoteUri,
        cacheKey: photoCacheKey(photo.profileId, photo.id, "display"),
      })),
    );
  }, [visible, initialIndex, photos]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const next = viewableItems[0]?.index;
      if (typeof next === "number") {
        setIndex(next);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const handleIndexChange = useCallback(
    (next: number) => {
      const neighbors = [next - 1, next, next + 1]
        .filter((i) => i >= 0 && i < photos.length)
        .map((i) => photos[i]);
      prefetchPhotos(
        neighbors.map((photo) => ({
          remoteUri: photo.remoteUri,
          cacheKey: photoCacheKey(photo.profileId, photo.id, "display"),
        })),
      );
    },
    [photos],
  );

  useEffect(() => {
    handleIndexChange(index);
  }, [handleIndexChange, index]);

  if (!photos.length) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.shell, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topBar}>
          <Text style={styles.counter}>
            {counterLabel(index + 1, photos.length)}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Text style={styles.closeText}>{closeLabel}</Text>
          </Pressable>
        </View>
        <FlatList
          key={`${visible ? "open" : "closed"}-${initialIndex}-${photos.map((p) => p.id).join(",")}`}
          data={photos}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          initialScrollIndex={Math.min(initialIndex, photos.length - 1)}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item }) => (
            <PhotoPage
              photo={item}
              width={width}
              height={height - insets.top - insets.bottom - 88}
              loadingLabel={loadingLabel}
            />
          )}
        />
        <Text style={styles.notice}>{confidentialNotice}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#0c0a09",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  counter: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  closeText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: {
    color: colors.zinc400,
    fontSize: 13,
  },
  notice: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    color: colors.zinc400,
    fontSize: 11,
    textAlign: "center",
  },
});
