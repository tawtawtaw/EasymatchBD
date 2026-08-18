import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EmptyState, ErrorState, LoadingState } from "../../components/ScreenState";
import { DiscoveryFieldSection } from "../../components/DiscoveryFieldSection";
import { PhotoGalleryModal } from "../../components/PhotoGalleryModal";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { ProfilePausedBanner } from "../../components/ProfilePausedBanner";
import { discoverySectionTitle } from "../../i18n/biodata-fields";
import { tDiscoveryProfile, tEndConnection } from "../../i18n/messages";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { getApiErrorMessage } from "../../lib/api-error";
import { confirmEndConnection } from "../../lib/end-connection";
import { resolveMemberDisplayName } from "../../lib/member-display";
import type { DiscoveryProfileScreenProps, MainTabParamList } from "../../navigation/types";
import { navigateToChatThread } from "../../navigation/nestedNavigation";
import { getDropdowns } from "../../services/dropdowns";
import {
  discoveryPhotoUrl,
  endConnection,
  getDiscoveryProfile,
  removeProfileBookmark,
  saveProfileBookmark,
  sendDiscoveryInterest,
} from "../../services/discovery";
import { ensureLocalPhoto, photoCacheKey, prefetchPhotos } from "../../lib/photo-cache";
import { visibleProfilePhotoIds } from "@easymatch/shared";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import type { AppLocale } from "../../lib/locale";
import { useMemberAlertsStore } from "../../store/memberAlertsStore";
import type { DropdownMap } from "../../types/dropdowns";
import type { DiscoveryProfile } from "../../types/discovery";
import { colors } from "../../theme/colors";

export default function DiscoveryProfileScreen({
  route,
  navigation,
}: DiscoveryProfileScreenProps) {
  const tabNavigation = navigation.getParent<
    BottomTabNavigationProp<MainTabParamList>
  >();
  const { profileId, profileCode } = route.params;
  const locale = useLocaleStore((s) => s.locale);
  const session = useAuthStore((s) => s.session);
  const isPaid = useIsPaidMember();
  const copy = tDiscoveryProfile(locale);
  const endCopy = tEndConnection(locale);
  const [profile, setProfile] = useState<DiscoveryProfile | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (options?: { silent?: boolean; forceFresh?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [data, dropdownData] = await Promise.all([
        getDiscoveryProfile(profileId, { forceFresh: options?.forceFresh }),
        getDropdowns(locale),
      ]);
      setProfile(data);
      setIsBookmarked(Boolean(data.isBookmarked));
      setDropdowns(dropdownData);
      navigation.setOptions({ title: data.profileCode });

      const photoId = data.media.primaryPhotoId;
      if (photoId) {
        setPhotoUri(discoveryPhotoUrl(profileId, photoId, "thumb"));
      } else {
        setPhotoUri(null);
      }
      const visibleIds = visibleProfilePhotoIds(data.media);
      prefetchPhotos(
        visibleIds.map((id) => ({
          remoteUri: discoveryPhotoUrl(profileId, id, "thumb"),
          cacheKey: photoCacheKey(profileId, id, "thumb"),
        })),
      );
    } catch (err) {
      if (!options?.silent) {
        setError(getApiErrorMessage(err, copy.loadError));
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [copy.loadError, locale, navigation, profileId]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      void load({ silent: hasLoadedRef.current });
      hasLoadedRef.current = true;
    }, [load]),
  );

  async function handleToggleBookmark() {
    setBookmarkBusy(true);
    setError(null);
    try {
      if (isBookmarked) {
        await removeProfileBookmark(profileCode || profileId);
        setIsBookmarked(false);
      } else {
        await saveProfileBookmark(profileCode || profileId);
        setIsBookmarked(true);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, copy.bookmarkError));
    } finally {
      setBookmarkBusy(false);
    }
  }

  function openReportMember() {
    tabNavigation?.navigate("Profile", {
      screen: "Complaints",
      params: { profileCode, openForm: true },
    });
  }

  async function handleSendInterest() {
    setActing(true);
    setMessage(null);
    setError(null);
    try {
      const result = await sendDiscoveryInterest(profileId);
      const nextStatus = result.mutual ? "connected" : "interest_sent";
      setProfile((current) =>
        current
          ? {
              ...current,
              relationship: {
                ...current.relationship,
                status: nextStatus,
              },
            }
          : current,
      );
      setMessage(result.mutual ? copy.mutualInterest : copy.interestSent);
      void useMemberAlertsStore.getState().refresh();
      void load({ silent: true, forceFresh: true });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.sendInterestError));
    } finally {
      setActing(false);
    }
  }

  function handleEndConnection() {
    const id = profile?.relationship.connectionId;
    if (!id) return;
    const privacyLevel =
      profile?.relationship.connectionPrivacyLevel ??
      profile?.viewerPrivacyLevel ??
      1;
    confirmEndConnection(endCopy, privacyLevel, () => {
      void (async () => {
        setActing(true);
        setError(null);
        setMessage(null);
        try {
          await endConnection(id);
          setMessage(endCopy.success);
          void useMemberAlertsStore.getState().refresh();
          await load({ silent: true, forceFresh: true });
        } catch (err) {
          setError(getApiErrorMessage(err, endCopy.error));
        } finally {
          setActing(false);
        }
      })();
    });
  }

  if (loading) {
    return <LoadingState label={copy.loading} />;
  }

  if (error && !profile) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  if (!profile) {
    return <EmptyState message={copy.notFound} icon="account-question-outline" />;
  }

  const name = resolveMemberDisplayName({ profileCode }, profile.personal, {
    profileRef: (code) => `${copy.profileId} ${code}`,
    member: copy.member,
  });
  const connectionId = profile.relationship.connectionId;
  const isSelf = profile.relationship.status === "self";
  const privacyHint = copy.cumulativePrivacyHint.replace(
    "{level}",
    String(profile.viewerPrivacyLevel),
  );
  const relationshipStatus = profile.relationship.status;
  const reconnectAvailableAt = profile.relationship.reconnectAvailableAt;
  const isProfilePaused = Boolean(session?.isPaused);
  const canSendInterest =
    relationshipStatus === "none" && !isProfilePaused && !reconnectAvailableAt;
  const isConnected = relationshipStatus === "connected" && connectionId;
  const tokenReady = photoUri !== null;
  const galleryPhotos = visibleProfilePhotoIds(profile.media).map((id) => ({
    id,
    profileId,
    remoteUri: discoveryPhotoUrl(profileId, id, "display"),
  }));

  function openGallery(photoId?: string) {
    if (!galleryPhotos.length) return;
    const index = photoId
      ? Math.max(0, galleryPhotos.findIndex((item) => item.id === photoId))
      : 0;
    setGalleryIndex(index);
  }

  function openChat() {
    if (!connectionId) return;
    navigateToChatThread(tabNavigation ?? navigation, {
      connectionId,
      memberName: name,
      profileCode,
    });
  }

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isProfilePaused ? (
        <View style={styles.pausedBannerWrap}>
          <ProfilePausedBanner locale={locale} />
        </View>
      ) : null}

      <View style={styles.hero}>
        {tokenReady ? (
          <Pressable onPress={() => openGallery()} accessibilityRole="imagebutton">
            <AuthenticatedPhoto uri={photoUri!} loadingLabel={copy.loadingPhoto} />
          </Pressable>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>{copy.noPhoto}</Text>
          </View>
        )}
        {galleryPhotos.length > 0 ? (
          <Text style={styles.galleryHint}>{copy.galleryOpenHint}</Text>
        ) : null}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.code}>
          {copy.profileId} {profileCode}
        </Text>
        {profile.media.isVerified ? (
          <Text style={styles.verified}>{copy.verifiedMember}</Text>
        ) : null}
        {profile.compatibility.totalCriteria > 0 ? (
          <Text style={styles.compat}>
            {copy.compatibility} {profile.compatibility.score}% (
            {profile.compatibility.matchedCount}/{profile.compatibility.totalCriteria})
          </Text>
        ) : (
          <Text style={styles.compatMuted}>{copy.compatibilityUnavailable}</Text>
        )}
        <Text style={styles.privacy}>
          {copy.privacyLevel} {profile.viewerPrivacyLevel}
          {profile.hiddenFieldCount > 0
            ? ` · ${profile.hiddenFieldCount} ${copy.fieldsHidden}`
            : ""}
        </Text>
        <Text style={styles.privacyHint}>{privacyHint}</Text>
      </View>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!isSelf ? (
        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.actionButton,
              isBookmarked && styles.actionButtonSaved,
              bookmarkBusy && styles.buttonDisabled,
            ]}
            onPress={() => void handleToggleBookmark()}
            disabled={bookmarkBusy}
          >
            <Text style={styles.actionButtonText}>
              {isBookmarked ? copy.savedBookmark : copy.saveBookmark}
            </Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("DiscoveryCompare", { profileId, profileCode })
            }
          >
            <Text style={styles.actionButtonText}>{copy.compareWithMe}</Text>
          </Pressable>
          <Pressable style={styles.actionButtonMuted} onPress={openReportMember}>
            <Text style={styles.actionButtonMutedText}>{copy.fileComplaint}</Text>
          </Pressable>
        </View>
      ) : null}

      <DiscoveryInterestActions
        copy={copy}
        endCopy={endCopy}
        locale={locale}
        isSelf={isSelf}
        isPaid={isPaid}
        acting={acting}
        relationshipStatus={relationshipStatus}
        reconnectAvailableAt={reconnectAvailableAt}
        canSendInterest={canSendInterest}
        isConnected={Boolean(isConnected)}
        onSendInterest={() => void handleSendInterest()}
        onOpenChat={openChat}
        onEndConnection={handleEndConnection}
      />

      {profile.media.galleryPhotoIds?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {discoverySectionTitle(locale, "gallery")}
          </Text>
          <Text style={styles.galleryHint}>{copy.galleryOpenHint}</Text>
          <Text style={styles.muted}>{copy.photoConfidentialNotice}</Text>
          <View style={styles.galleryGrid}>
            {profile.media.galleryPhotoIds.map((photoId) => (
              <Pressable
                key={photoId}
                onPress={() => openGallery(photoId)}
                accessibilityRole="imagebutton"
              >
                <AuthenticatedPhoto
                  uri={discoveryPhotoUrl(profileId, photoId, "thumb")}
                  loadingLabel={copy.loadingPhoto}
                  compact
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <DiscoveryFieldSection
        title={discoverySectionTitle(locale, "personal")}
        kind="personal"
        data={profile.personal}
        dropdowns={dropdowns}
        locale={locale}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={discoverySectionTitle(locale, "family")}
        kind="family"
        data={profile.family}
        dropdowns={dropdowns}
        locale={locale}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={discoverySectionTitle(locale, "marital")}
        kind="marital"
        data={profile.marital}
        dropdowns={dropdowns}
        locale={locale}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={discoverySectionTitle(locale, "siblings")}
        kind="siblings"
        data={profile.siblings}
        dropdowns={dropdowns}
        locale={locale}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={discoverySectionTitle(locale, "paternalRelatives")}
        kind="paternal_relatives"
        data={profile.paternalRelatives}
        dropdowns={dropdowns}
        locale={locale}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={discoverySectionTitle(locale, "maternalRelatives")}
        kind="maternal_relatives"
        data={profile.maternalRelatives}
        dropdowns={dropdowns}
        locale={locale}
        personal={profile.personal}
      />
      <DiscoveryFieldSection
        title={discoverySectionTitle(locale, "partner")}
        kind="partner"
        data={profile.partner}
        dropdowns={dropdowns}
        locale={locale}
        personal={profile.personal}
      />

      <DiscoveryInterestActions
        copy={copy}
        endCopy={endCopy}
        locale={locale}
        isSelf={isSelf}
        isPaid={isPaid}
        acting={acting}
        relationshipStatus={relationshipStatus}
        reconnectAvailableAt={reconnectAvailableAt}
        canSendInterest={canSendInterest}
        isConnected={Boolean(isConnected)}
        onSendInterest={() => void handleSendInterest()}
        onOpenChat={openChat}
        onEndConnection={handleEndConnection}
        bottom
      />
    </ScrollView>
    <PhotoGalleryModal
      visible={galleryIndex !== null && galleryPhotos.length > 0}
      photos={galleryPhotos}
      initialIndex={galleryIndex ?? 0}
      closeLabel={copy.galleryClose}
      confidentialNotice={copy.photoConfidentialNotice}
      loadingLabel={copy.loadingPhoto}
      counterLabel={(current, total) =>
        copy.galleryCounter
          .replace("{current}", String(current))
          .replace("{total}", String(total))
      }
      onClose={() => setGalleryIndex(null)}
    />
    </>
  );
}

type DiscoveryInterestActionsProps = {
  copy: ReturnType<typeof tDiscoveryProfile>;
  endCopy: ReturnType<typeof tEndConnection>;
  locale: AppLocale;
  isSelf: boolean;
  isPaid: boolean;
  acting: boolean;
  relationshipStatus: DiscoveryProfile["relationship"]["status"];
  reconnectAvailableAt?: string | null;
  canSendInterest: boolean;
  isConnected: boolean;
  onSendInterest: () => void;
  onOpenChat: () => void;
  onEndConnection: () => void;
  bottom?: boolean;
};

function DiscoveryInterestActions({
  copy,
  endCopy,
  locale,
  isSelf,
  isPaid,
  acting,
  relationshipStatus,
  reconnectAvailableAt,
  canSendInterest,
  isConnected,
  onSendInterest,
  onOpenChat,
  onEndConnection,
  bottom = false,
}: DiscoveryInterestActionsProps) {
  if (isSelf) {
    return null;
  }

  const wrapperStyle = bottom ? styles.bottomInterestActions : undefined;
  const cooldownLabel = reconnectAvailableAt
    ? endCopy.reconnectCooldown.replace(
        "{date}",
        new Date(reconnectAvailableAt).toLocaleDateString(
          locale === "bn" ? "bn-BD" : "en-GB",
          { day: "numeric", month: "short", year: "numeric" },
        ),
      )
    : null;

  return (
    <View style={wrapperStyle}>
      {canSendInterest ? (
        isPaid ? (
          <Pressable
            style={[styles.primaryButton, acting && styles.buttonDisabled]}
            onPress={onSendInterest}
            disabled={acting}
          >
            <Text style={styles.primaryButtonText}>
              {acting ? copy.sending : copy.sendInterest}
            </Text>
          </Pressable>
        ) : (
          <PaidMembershipGate feature="interest" locale={locale} compact />
        )
      ) : relationshipStatus === "none" && cooldownLabel ? (
        <View style={styles.interestSentBadge}>
          <Text style={styles.interestSentBadgeText}>{cooldownLabel}</Text>
        </View>
      ) : relationshipStatus === "interest_sent" ? (
        <View style={styles.interestSentBadge}>
          <Text style={styles.interestSentBadgeText}>{copy.interestSentBadge}</Text>
        </View>
      ) : relationshipStatus === "interest_received" ? (
        <View style={styles.interestReceivedBadge}>
          <Text style={styles.interestReceivedBadgeText}>{copy.interestReceived}</Text>
        </View>
      ) : isConnected ? (
        <>
          <View style={styles.connectedBadge}>
            <Text style={styles.connectedBadgeText}>{copy.connectedBadge}</Text>
          </View>
          {isPaid ? (
            <Pressable style={styles.primaryButton} onPress={onOpenChat}>
              <Text style={styles.primaryButtonText}>{copy.openChat}</Text>
            </Pressable>
          ) : (
            <PaidMembershipGate feature="messages" locale={locale} compact />
          )}
          <Pressable
            style={[styles.secondaryButton, acting && styles.buttonDisabled]}
            onPress={onEndConnection}
            disabled={acting}
          >
            <Text style={styles.secondaryButtonText}>{endCopy.button}</Text>
          </Pressable>
        </>
      ) : relationshipStatus === "connected" ? (
        <View style={styles.connectedBadge}>
          <Text style={styles.connectedBadgeText}>{copy.connectedBadge}</Text>
        </View>
      ) : null}
    </View>
  );
}

function AuthenticatedPhoto({
  uri,
  loadingLabel,
  compact = false,
}: {
  uri: string;
  loadingLabel: string;
  compact?: boolean;
}) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLocalUri(null);
    setFailed(false);
    void ensureLocalPhoto(uri, uri)
      .then((next) => {
        if (!cancelled) setLocalUri(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!localUri) {
    return (
      <View style={[styles.photoPlaceholder, compact && styles.galleryPhoto]}>
        <Text style={styles.photoPlaceholderText}>
          {failed ? "—" : loadingLabel}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: localUri }}
      style={[styles.photo, compact && styles.galleryPhoto]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  pausedBannerWrap: {
    marginBottom: 12,
  },
  bottomInterestActions: {
    marginTop: 8,
  },
  hero: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 16,
    alignItems: "center",
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: colors.rose100,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: colors.rose100,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: colors.zinc500,
  },
  galleryHint: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
    color: colors.rose800,
  },
  name: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "800",
    color: colors.zinc900,
    textAlign: "center",
  },
  code: {
    marginTop: 4,
    fontSize: 12,
    color: colors.zinc500,
  },
  verified: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: colors.emerald600,
  },
  compat: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: colors.emerald600,
  },
  compatMuted: {
    marginTop: 6,
    fontSize: 12,
    color: colors.zinc500,
    textAlign: "center",
  },
  privacy: {
    marginTop: 6,
    fontSize: 12,
    color: colors.zinc600,
    textAlign: "center",
  },
  privacyHint: {
    marginTop: 4,
    fontSize: 11,
    color: colors.zinc500,
    textAlign: "center",
  },
  success: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    color: colors.emerald600,
    fontSize: 13,
    fontWeight: "600",
  },
  error: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.rose900,
    fontSize: 15,
    fontWeight: "700",
  },
  actionRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionButtonSaved: {
    backgroundColor: colors.rose50,
    borderColor: colors.rose800,
  },
  actionButtonText: {
    color: colors.rose900,
    fontSize: 13,
    fontWeight: "700",
  },
  actionButtonMuted: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionButtonMutedText: {
    color: colors.zinc800,
    fontSize: 13,
    fontWeight: "600",
  },
  interestSentBadge: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 14,
  },
  interestSentBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    textAlign: "center",
  },
  interestReceivedBadge: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 14,
  },
  interestReceivedBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
    textAlign: "center",
  },
  connectedBadge: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#86efac",
    padding: 14,
  },
  connectedBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.emerald600,
    textAlign: "center",
  },
  section: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
    marginBottom: 10,
  },
  muted: {
    fontSize: 13,
    color: colors.zinc600,
    marginBottom: 10,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  galleryPhoto: {
    width: 96,
    height: 96,
    borderRadius: 12,
  },
});
