import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  DiscoveryFiltersModal,
  discoveryFilterLabels,
} from "../../components/discovery/DiscoveryFiltersModal";
import { DiscoveryProfileCard } from "../../components/DiscoveryProfileCard";
import { ProfilePausedBanner } from "../../components/ProfilePausedBanner";
import { VerificationFeedbackPanel } from "../../components/VerificationFeedbackPanel";
import { EmptyState, ErrorState } from "../../components/ScreenState";
import { ProfileListSkeleton } from "../../components/Skeleton";
import { tDiscoveryList, tProfileMedia } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import {
  countActiveFilters,
  EMPTY_DISCOVERY_FILTERS,
  filtersFromPartnerPreference,
  formatFilterChipLabel,
} from "../../lib/discovery-filters";
import { shouldShowVerificationFeedback } from "../../lib/verification-feedback";
import type { DiscoveryListScreenProps } from "../../navigation/types";
import {
  findDiscoveryProfileByCode,
  listDiscoveryProfiles,
} from "../../services/discovery";
import { getDropdowns } from "../../services/dropdowns";
import { getMyProfile } from "../../services/profile";
import { useMemberVerificationStore } from "../../store/memberVerificationStore";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import type { DiscoveryFilters } from "../../types/discovery-filters";
import type { DiscoveryListItem } from "../../types/discovery";
import type { DropdownMap } from "../../types/dropdowns";
import { colors } from "../../theme/colors";

const PAGE_SIZE = 20;

export default function DiscoveryListScreen({ navigation }: DiscoveryListScreenProps) {
  const session = useAuthStore((s) => s.session);
  const locale = useLocaleStore((s) => s.locale);
  const copy = tDiscoveryList(locale);
  const mediaCopy = tProfileMedia(locale);
  const [items, setItems] = useState<DiscoveryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(EMPTY_DISCOVERY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<DiscoveryFilters>(EMPTY_DISCOVERY_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const verificationFeedback = useMemberVerificationStore(
    (s) => s.verificationFeedback,
  );
  const syncVerification = useMemberVerificationStore((s) => s.sync);

  const activeFilterCount = countActiveFilters(appliedFilters);
  const filterLabels = discoveryFilterLabels(copy);
  const isProfilePaused = Boolean(session?.isPaused);

  useFocusEffect(
    useCallback(() => {
      void syncVerification(true);
    }, [syncVerification]),
  );

  useEffect(() => {
    void getDropdowns(locale).then(setDropdowns);
  }, [locale]);

  const loadPage = useCallback(
    async (nextPage: number, mode: "initial" | "refresh" | "more", filters: DiscoveryFilters) => {
      if (mode === "refresh") setRefreshing(true);
      else if (mode === "more") setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await listDiscoveryProfiles(nextPage, PAGE_SIZE, filters, {
          forceFresh: mode === "refresh",
        });
        let nextItems = Array.isArray(result.items) ? result.items : [];

        if (nextItems.length === 0 && mode !== "more" && filters.profileCode) {
          const match = await findDiscoveryProfileByCode(filters.profileCode);
          if (match) nextItems = [match];
        }

        setTotal(
          result.total > 0
            ? result.total
            : nextItems.length === PAGE_SIZE
              ? nextPage * PAGE_SIZE + 1
              : (nextPage - 1) * PAGE_SIZE + nextItems.length,
        );
        setPage(nextPage);
        setItems((current) => (mode === "more" ? [...current, ...nextItems] : nextItems));
      } catch (err) {
        setError(getApiErrorMessage(err, copy.loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [copy.loadError],
  );

  useEffect(() => {
    void loadPage(1, "initial", appliedFilters);
  }, [appliedFilters, loadPage]);

  const hasMore = items.length < total;

  const openFilters = useCallback(() => {
    setDraftFilters({ ...appliedFilters });
    setFiltersVisible(true);
  }, [appliedFilters]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate("SavedProfiles")}
            style={styles.headerActionBtn}
          >
            <Text style={styles.headerBtnText}>{copy.saved}</Text>
          </Pressable>
          <Pressable onPress={openFilters} style={styles.headerActionBtn}>
            <Text style={styles.headerBtnText}>{copy.filters}</Text>
            {activeFilterCount > 0 ? (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      ),
    });
  }, [activeFilterCount, copy.filters, copy.saved, navigation, openFilters]);

  async function handleUseMyPreferences() {
    try {
      const profile = await getMyProfile();
      if (profile.partnerPreference) {
        setDraftFilters(filtersFromPartnerPreference(profile.partnerPreference));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, copy.preferencesError));
    }
  }

  function handleApplyFilters() {
    setAppliedFilters({ ...draftFilters });
    setFiltersVisible(false);
  }

  function handleClearFilters() {
    setDraftFilters(EMPTY_DISCOVERY_FILTERS);
    setAppliedFilters(EMPTY_DISCOVERY_FILTERS);
    setFiltersVisible(false);
  }

  const summaryText =
    total === 1
      ? copy.matchedSummaryOne
      : copy.matchedSummary.replace("{count}", String(total));

  if (loading && !refreshing && items.length === 0) {
    return <ProfileListSkeleton />;
  }

  if (error && items.length === 0) {
    return <ErrorState message={error} onRetry={() => void loadPage(1, "initial", appliedFilters)} />;
  }

  return (
    <View style={styles.container}>
      <DiscoveryFiltersModal
        visible={filtersVisible}
        draft={draftFilters}
        dropdowns={dropdowns}
        locale={locale}
        onClose={() => setFiltersVisible(false)}
        onDraftChange={setDraftFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        onUseMyPreferences={() => void handleUseMyPreferences()}
      />

      {verificationFeedback && shouldShowVerificationFeedback(verificationFeedback) ? (
        <View style={styles.feedbackWrap}>
          <VerificationFeedbackPanel
            copy={mediaCopy}
            feedback={verificationFeedback}
            compact
            hideAlertHistory
          />
        </View>
      ) : null}

      {isProfilePaused ? (
        <View style={styles.feedbackWrap}>
          <ProfilePausedBanner locale={locale} />
        </View>
      ) : null}

      <View style={styles.summaryBlock}>
        <Text style={styles.summary}>{summaryText}</Text>
        {activeFilterCount > 0 ? (
          <>
            <Text style={styles.filtersSummary}>{copy.filtersAppliedSummary}</Text>
            <View style={styles.chips}>
              {Object.entries(appliedFilters).map(([key, value]) =>
                value ? (
                  <View key={key} style={styles.chip}>
                    <Text style={styles.chipText}>
                      {formatFilterChipLabel(key, value, dropdowns, filterLabels)}
                    </Text>
                  </View>
                ) : null,
              )}
            </View>
          </>
        ) : null}
      </View>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.profileId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void syncVerification(true);
              void loadPage(1, "refresh", appliedFilters);
            }}
          />
        }
        onEndReached={() => {
          if (!loadingMore && hasMore) void loadPage(page + 1, "more", appliedFilters);
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <EmptyState message={copy.empty} icon="account-search-outline" />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.rose800} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <DiscoveryProfileCard
            item={item}
            bookmarkedLabel={copy.saved}
            onPress={() =>
              navigation.navigate("DiscoveryProfile", {
                profileId: item.profileId,
                profileCode: item.profileCode,
              })
            }
          />
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
  feedbackWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginRight: 8,
  },
  headerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    gap: 6,
  },
  headerBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  headerBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.rose800,
  },
  summaryBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  summary: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc600,
  },
  filtersSummary: {
    marginTop: 8,
    fontSize: 11,
    color: colors.zinc500,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  chip: {
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rose100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    color: colors.zinc700,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
  list: {
    padding: 16,
    paddingTop: 8,
    // Without this the empty state, which fills its parent, collapses to nothing.
    flexGrow: 1,
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
