import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DiscoveryProfileCard } from "../../components/DiscoveryProfileCard";
import { EmptyState, ErrorState } from "../../components/ScreenState";
import { ProfileListSkeleton } from "../../components/Skeleton";
import { tSavedProfiles } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import type { SavedProfilesScreenProps } from "../../navigation/types";
import { listSavedProfiles, removeProfileBookmark } from "../../services/discovery";
import { useLocaleStore } from "../../store/localeStore";
import type { SavedProfileItem } from "../../types/discovery";
import { colors } from "../../theme/colors";

function formatSavedDate(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function SavedProfilesScreen({ navigation }: SavedProfilesScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tSavedProfiles(locale);
  const [items, setItems] = useState<SavedProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (options?: { refresh?: boolean; silent?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!options?.silent) setLoading(true);
    setError(null);
    try {
      setItems(
        await listSavedProfiles({ forceFresh: options?.refresh === true }),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load({ silent: hasLoadedRef.current });
      hasLoadedRef.current = true;
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.title });
  }, [copy.title, navigation]);

  async function handleRemove(profileCode: string) {
    setActingId(profileCode);
    setError(null);
    try {
      await removeProfileBookmark(profileCode);
      setItems((current) => current.filter((item) => item.profileCode !== profileCode));
    } catch (err) {
      setError(getApiErrorMessage(err, copy.removeError));
    } finally {
      setActingId(null);
    }
  }

  if (loading && !refreshing) {
    return <ProfileListSkeleton />;
  }

  if (error && items.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.bookmarkId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load({ refresh: true })} />
        }
        ListEmptyComponent={<EmptyState message={copy.empty} icon="bookmark-outline" />}
        renderItem={({ item }) => (
          <View style={styles.itemWrap}>
            <DiscoveryProfileCard
              item={{ ...item, isBookmarked: true }}
              bookmarkedLabel={copy.bookmarked}
              onPress={() =>
                navigation.navigate("DiscoveryProfile", {
                  profileId: item.profileId,
                  profileCode: item.profileCode,
                })
              }
            />
            <View style={styles.itemFooter}>
              <Text style={styles.savedOn}>
                {copy.savedOn.replace("{date}", formatSavedDate(item.savedAt, locale))}
              </Text>
              <Pressable
                style={styles.removeBtn}
                onPress={() => void handleRemove(item.profileCode)}
                disabled={actingId === item.profileCode}
              >
                <Text style={styles.removeText}>
                  {actingId === item.profileCode ? copy.removing : copy.remove}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  subtitle: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 13,
    lineHeight: 20,
    color: colors.zinc600,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  itemWrap: {
    marginBottom: 4,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: -4,
    marginBottom: 10,
  },
  savedOn: {
    fontSize: 11,
    color: colors.zinc500,
  },
  removeBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  removeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.rose800,
  },
});
