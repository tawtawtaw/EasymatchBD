import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  canAddFamilyGalleryPhoto,
  canAddOtherGalleryPhoto,
  isOnBehalfProfile,
  splitGalleryPhotos,
} from "@easymatch/shared";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import { MediaCaptureActions } from "../../components/MediaCaptureActions";
import { VerificationFeedbackPanel } from "../../components/VerificationFeedbackPanel";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { tProfileMedia } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import {
  captureImageFromCamera,
  pickDocumentFile,
  pickImageFromLibrary,
  type CaptureOutcome,
  type PickedMediaFile,
} from "../../lib/media-capture";
import { promptOpenAppSettings } from "../../lib/permission-settings";
import {
  getOnboardingMediaStep,
  getRequiredNidSubject,
  type OnboardingMediaStep,
} from "../../lib/onboarding-media-steps";
import { computeVerificationSubmitState, isVerificationAwaitingOfficer, requiredNidStatus } from "../../lib/verification-submit-state";
import { clearMemberVerificationMediaCache } from "../../hooks/use-member-verification-state";
import { invalidateDedupeCache } from "../../services/api/dedupe";
import { useMemberVerificationStore } from "../../store/memberVerificationStore";
import { shouldShowVerificationFeedback } from "../../lib/verification-feedback";
import type { ProfileMediaScreenProps } from "../../navigation/types";
import {
  deleteProfilePhoto,
  dismissVerificationAlerts,
  getProfileMedia,
  profilePhotoUrl,
  setPrimaryPhoto,
  submitForVerification,
  uploadNidDocument,
  uploadProfilePhoto,
} from "../../services/media";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import {
  MAX_NID_BYTES,
  MAX_PHOTO_BYTES,
  type NidDocumentSide,
  type NidDocumentSubject,
  type ProfileMedia,
  type ProfilePhoto,
} from "../../types/media";
import { colors } from "../../theme/colors";

export default function ProfileMediaScreen({ navigation }: ProfileMediaScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const onboardingPhase = useOnboardingStore((s) => s.phase);
  const refreshOnboarding = useOnboardingStore((s) => s.refresh);
  const isOnboardingSetup = onboardingPhase === "profile_setup";
  const copy = tProfileMedia(locale);
  const [media, setMedia] = useState<ProfileMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dismissingAlerts, setDismissingAlerts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMedia(await getProfileMedia());
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  const handleDismissAlerts = useCallback(async () => {
    setDismissingAlerts(true);
    setError(null);
    try {
      await dismissVerificationAlerts();
      clearMemberVerificationMediaCache();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setDismissingAlerts(false);
    }
  }, [copy.loadError, load]);

  useFocusEffect(
    useCallback(() => {
      invalidateDedupeCache("auth:");
      clearMemberVerificationMediaCache();
      void useMemberVerificationStore.getState().sync(true);
      void load();
    }, [load]),
  );

  async function uploadPhotoFile(
    file: PickedMediaFile,
    type: "primary" | "gallery",
    gallerySlot?: "other" | "family",
  ) {
    if ((file.fileSize ?? 0) > MAX_PHOTO_BYTES) {
      setError(copy.photoTooLarge);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadProfilePhoto(
        {
          uri: file.uri,
          name: file.name,
          type: file.type,
        },
        type,
        gallerySlot,
      );
      setMessage(copy.uploaded);
      await load();
      await refreshSession();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.uploadError));
    } finally {
      setBusy(false);
    }
  }

  async function resolveCaptureOutcome(outcome: CaptureOutcome): Promise<PickedMediaFile | null> {
    if (outcome.status === "permission_denied") {
      setError(copy.cameraPermissionDenied);
      if (outcome.canOpenSettings) {
        promptOpenAppSettings(
          copy.openSettingsTitle,
          copy.cameraPermissionDenied,
          copy.openSettings,
        );
      }
      return null;
    }
    if (outcome.status === "error") {
      setError(outcome.message);
      return null;
    }
    if (outcome.status === "unavailable") {
      setError(copy.cameraCaptureFailed);
      return null;
    }
    if (outcome.status === "cancelled") return null;
    return outcome.file;
  }

  async function handlePhotoFromCamera(
    type: "primary" | "gallery",
    gallerySlot?: "other" | "family",
  ) {
    const outcome = await captureImageFromCamera(`${type}-${Date.now()}.jpg`, {
      allowsEditing: type === "primary",
      aspect: type === "primary" ? [3, 4] : undefined,
      facing: type === "primary" ? "front" : "back",
    });
    const file = await resolveCaptureOutcome(outcome);
    if (!file) return;
    await uploadPhotoFile(file, type, gallerySlot);
  }

  async function handlePhotoFromGallery(
    type: "primary" | "gallery",
    gallerySlot?: "other" | "family",
  ) {
    const outcome = await pickImageFromLibrary(`${type}-${Date.now()}.jpg`, {
      allowsEditing: type === "primary",
      aspect: type === "primary" ? [3, 4] : undefined,
    });
    if (outcome.status === "permission_denied") {
      setError(copy.photoPermissionDenied);
      if (outcome.canOpenSettings) {
        promptOpenAppSettings(
          copy.openSettingsTitle,
          copy.photoPermissionDenied,
          copy.openSettings,
        );
      }
      return;
    }
    if (outcome.status === "error") {
      setError(outcome.message);
      return;
    }
    if (outcome.status === "cancelled") return;
    if (outcome.status !== "success") return;
    await uploadPhotoFile(outcome.file, type, gallerySlot);
  }

  async function uploadNidFile(
    file: PickedMediaFile,
    side: NidDocumentSide,
    subject: NidDocumentSubject,
  ) {
    if ((file.fileSize ?? 0) > MAX_NID_BYTES) {
      setError(copy.nidTooLarge);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadNidDocument(
        {
          uri: file.uri,
          name: file.name,
          type: file.type,
        },
        side,
        subject,
      );
      setMessage(copy.uploaded);
      await load();
      await refreshSession();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.uploadError));
    } finally {
      setBusy(false);
    }
  }

  async function handleNidFromCamera(side: NidDocumentSide, subject: NidDocumentSubject) {
    const outcome = await captureImageFromCamera(`nid-${subject}-${side}-${Date.now()}.jpg`, {
      facing: "back",
    });
    const file = await resolveCaptureOutcome(outcome);
    if (!file) return;
    await uploadNidFile(file, side, subject);
  }

  async function handleNidFromGallery(side: NidDocumentSide, subject: NidDocumentSubject) {
    const outcome = await pickImageFromLibrary(`nid-${subject}-${side}-${Date.now()}.jpg`);
    if (outcome.status === "permission_denied") {
      setError(copy.photoPermissionDenied);
      if (outcome.canOpenSettings) {
        promptOpenAppSettings(
          copy.openSettingsTitle,
          copy.photoPermissionDenied,
          copy.openSettings,
        );
      }
      return;
    }
    if (outcome.status === "error") {
      setError(outcome.message);
      return;
    }
    if (outcome.status === "cancelled") return;
    if (outcome.status !== "success") return;
    await uploadNidFile(outcome.file, side, subject);
  }

  async function handleNidFromFile(side: NidDocumentSide, subject: NidDocumentSubject) {
    const file = await pickDocumentFile();
    if (!file) return;
    await uploadNidFile(file, side, subject);
  }

  async function handleSetPrimary(photo: ProfilePhoto) {
    setBusy(true);
    try {
      await setPrimaryPhoto(photo.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionError));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    setBusy(true);
    try {
      await deleteProfilePhoto(photoId);
      await load();
      await refreshSession();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionError));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitVerification() {
    if (!media) return;
    if (computeVerificationSubmitState(media).nidRejected) {
      setError(copy.submitRejectedNid);
      setMessage(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await submitForVerification();
      if (result.submitted) {
        setMessage(result.message ?? copy.submitted);
      } else {
        setError(result.message ?? copy.submitNotQueued);
        setMessage(null);
      }
      clearMemberVerificationMediaCache();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.submitError));
    } finally {
      setBusy(false);
    }
  }

  async function handleContinueSetup() {
    await refreshOnboarding(locale);
    navigation.replace("ProfileSetup");
  }

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.title });
  }, [copy.title, navigation]);

  if (loading) return <LoadingState label={copy.loading} />;
  if (error && !media) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!media) return null;

  const photos = media.photos ?? [];
  const nidDocuments = media.nidDocuments ?? [];
  const onBehalf = isOnBehalfProfile(media);
  const requiredSubject = getRequiredNidSubject(media);
  const primary = photos.find((p) => p.type === "primary");
  const gallery = photos.filter((p) => p.type === "gallery");
  const creatorNidFront = nidDocuments.find(
    (d) => d.side === "front" && d.subject === "creator",
  );
  const creatorNidBack = nidDocuments.find(
    (d) => d.side === "back" && d.subject === "creator",
  );
  const memberNidFront = nidDocuments.find(
    (d) => d.side === "front" && d.subject === "member",
  );
  const memberNidBack = nidDocuments.find(
    (d) => d.side === "back" && d.subject === "member",
  );
  const requiredNidFront = nidDocuments.find(
    (d) => d.side === "front" && d.subject === requiredSubject,
  );
  const requiredNidBack = nidDocuments.find(
    (d) => d.side === "back" && d.subject === requiredSubject,
  );
  const { otherPhoto, familyPhotos } = splitGalleryPhotos(gallery);
  const canAddOther = canAddOtherGalleryPhoto(gallery.length, otherPhoto);
  const canAddFamily = canAddFamilyGalleryPhoto(gallery.length, familyPhotos);
  const onboardingStep = isOnboardingSetup ? getOnboardingMediaStep(media) : null;
  const submitState = computeVerificationSubmitState(media);
  const awaitingOfficer = isVerificationAwaitingOfficer(media);
  const canSubmitNow =
    !awaitingOfficer && (submitState.readyToSubmit || submitState.canResubmit);
  const submitDisabled =
    busy || media.isVerified || !submitState.packageComplete || !canSubmitNow;
  const awaitingReview = awaitingOfficer || (submitState.isPendingReview && !submitState.canResubmit);

  let submitLabel: string = copy.submitForReview;
  if (busy) submitLabel = copy.submitVerification;
  else if (media.isVerified) submitLabel = copy.verifiedButton;
  else if (awaitingReview) submitLabel = copy.pendingReviewButton;
  else if (submitState.canResubmit) submitLabel = copy.resubmitForReview;

  const displayNidStatus = requiredNidStatus(media) ?? media.nidStatus;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isOnboardingSetup && onboardingStep ? (
        <OnboardingMediaBanner step={onboardingStep} copy={copy} />
      ) : null}

      {media.verificationFeedback &&
      shouldShowVerificationFeedback(media.verificationFeedback) ? (
        <VerificationFeedbackPanel
          copy={copy}
          feedback={media.verificationFeedback}
          onDismiss={() => void handleDismissAlerts()}
          dismissing={dismissingAlerts}
        />
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{copy.verificationStatus}</Text>
          <Text style={styles.meta}>
            {copy.profileVerified}: {media.isVerified ? copy.yes : copy.no}
          </Text>
          <Text style={styles.meta}>
            {copy.nidStatus}: {displayNidStatus.replace(/_/g, " ")}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.card,
          onboardingStep === "primary" && styles.cardHighlight,
        ]}
      >
        <Text style={styles.sectionTitle}>{copy.primaryPhoto}</Text>
        {onboardingStep === "primary" ? (
          <Text style={styles.stepHint}>{copy.onboardingStepPrimaryHint}</Text>
        ) : null}
        {primary ? (
          <>
            <AuthenticatedImage
              path={profilePhotoUrl(primary.id)}
              style={styles.primaryPhoto}
              loadingLabel={copy.loadingPhoto}
            />
            <StatusBadge status={primary.status} />
          </>
        ) : (
          <Text style={styles.muted}>{copy.noPrimaryPhoto}</Text>
        )}
        <MediaCaptureActions
          takePhotoLabel={primary ? copy.retakePrimary : copy.takePrimaryPhoto}
          chooseGalleryLabel={primary ? copy.replaceFromGallery : copy.chooseFromGallery}
          onTakePhoto={() => void handlePhotoFromCamera("primary")}
          onChooseGallery={() => void handlePhotoFromGallery("primary")}
          disabled={busy}
          emphasizeCamera={onboardingStep === "primary"}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.otherPhoto}</Text>
        <Text style={styles.hint}>{copy.otherPhotoHint}</Text>
        {otherPhoto ? (
          <View style={styles.galleryItem}>
            <AuthenticatedImage
              path={profilePhotoUrl(otherPhoto.id)}
              style={styles.galleryPhoto}
              loadingLabel={copy.loadingPhoto}
            />
            <StatusBadge status={otherPhoto.status} compact />
            {primary?.id !== otherPhoto.id ? (
              <Pressable onPress={() => void handleSetPrimary(otherPhoto)} disabled={busy}>
                <Text style={styles.link}>{copy.setPrimary}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => void handleDeletePhoto(otherPhoto.id)} disabled={busy}>
              <Text style={styles.linkDanger}>{copy.remove}</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.muted}>{copy.noOtherPhoto}</Text>
        )}
        {canAddOther ? (
          <MediaCaptureActions
            takePhotoLabel={copy.takePhoto}
            chooseGalleryLabel={copy.chooseFromGallery}
            onTakePhoto={() => void handlePhotoFromCamera("gallery", "other")}
            onChooseGallery={() => void handlePhotoFromGallery("gallery", "other")}
            disabled={busy}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.familyPhoto}</Text>
        <Text style={styles.hint}>{copy.familyPhotoHint}</Text>
        <View style={styles.galleryRow}>
          {familyPhotos.map((photo) => (
            <View key={photo.id} style={styles.galleryItem}>
              <AuthenticatedImage
                path={profilePhotoUrl(photo.id)}
                style={styles.galleryPhoto}
                loadingLabel={copy.loadingPhoto}
              />
              <StatusBadge status={photo.status} compact />
              {primary?.id !== photo.id ? (
                <Pressable onPress={() => void handleSetPrimary(photo)} disabled={busy}>
                  <Text style={styles.link}>{copy.setPrimary}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => void handleDeletePhoto(photo.id)} disabled={busy}>
                <Text style={styles.linkDanger}>{copy.remove}</Text>
              </Pressable>
            </View>
          ))}
        </View>
        {!familyPhotos.length ? <Text style={styles.muted}>{copy.noFamilyPhoto}</Text> : null}
        {canAddFamily ? (
          <MediaCaptureActions
            takePhotoLabel={copy.takePhoto}
            chooseGalleryLabel={copy.chooseFromGallery}
            onTakePhoto={() => void handlePhotoFromCamera("gallery", "family")}
            onChooseGallery={() => void handlePhotoFromGallery("gallery", "family")}
            disabled={busy}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.card,
          (onboardingStep === "nidFront" || onboardingStep === "nidBack") &&
            styles.cardHighlight,
        ]}
      >
        <Text style={styles.sectionTitle}>
          {onBehalf ? copy.creatorNidTitle : copy.nidDocuments}
        </Text>
        {onBehalf ? <Text style={styles.hint}>{copy.creatorNidHint}</Text> : null}
        <NidRow
          label={copy.nidFront}
          status={onBehalf ? creatorNidFront?.status : requiredNidFront?.status}
          hint={onboardingStep === "nidFront" ? copy.onboardingStepNidFrontHint : undefined}
          takePhotoLabel={
            (onBehalf ? creatorNidFront : requiredNidFront)
              ? copy.retakePhoto
              : copy.takeNidPhoto
          }
          chooseGalleryLabel={copy.chooseFromGallery}
          chooseFileLabel={copy.chooseFile}
          onTakePhoto={() => void handleNidFromCamera("front", requiredSubject)}
          onChooseGallery={() => void handleNidFromGallery("front", requiredSubject)}
          onChooseFile={() => void handleNidFromFile("front", requiredSubject)}
          busy={busy}
          emphasizeCamera={onboardingStep === "nidFront"}
        />
        <NidRow
          label={copy.nidBack}
          status={onBehalf ? creatorNidBack?.status : requiredNidBack?.status}
          hint={onboardingStep === "nidBack" ? copy.onboardingStepNidBackHint : undefined}
          takePhotoLabel={
            (onBehalf ? creatorNidBack : requiredNidBack)
              ? copy.retakePhoto
              : copy.takeNidPhoto
          }
          chooseGalleryLabel={copy.chooseFromGallery}
          chooseFileLabel={copy.chooseFile}
          onTakePhoto={() => void handleNidFromCamera("back", requiredSubject)}
          onChooseGallery={() => void handleNidFromGallery("back", requiredSubject)}
          onChooseFile={() => void handleNidFromFile("back", requiredSubject)}
          busy={busy}
          emphasizeCamera={onboardingStep === "nidBack"}
        />
        {!onBehalf ? <Text style={styles.hint}>{copy.nidHint}</Text> : null}
      </View>

      {onBehalf ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{copy.memberNidTitle}</Text>
          <Text style={styles.hint}>{copy.memberNidHint}</Text>
          <NidRow
            label={copy.nidFront}
            status={memberNidFront?.status}
            takePhotoLabel={memberNidFront ? copy.retakePhoto : copy.takeNidPhoto}
            chooseGalleryLabel={copy.chooseFromGallery}
            chooseFileLabel={copy.chooseFile}
            onTakePhoto={() => void handleNidFromCamera("front", "member")}
            onChooseGallery={() => void handleNidFromGallery("front", "member")}
            onChooseFile={() => void handleNidFromFile("front", "member")}
            busy={busy}
          />
          <NidRow
            label={copy.nidBack}
            status={memberNidBack?.status}
            takePhotoLabel={memberNidBack ? copy.retakePhoto : copy.takeNidPhoto}
            chooseGalleryLabel={copy.chooseFromGallery}
            chooseFileLabel={copy.chooseFile}
            onTakePhoto={() => void handleNidFromCamera("back", "member")}
            onChooseGallery={() => void handleNidFromGallery("back", "member")}
            onChooseFile={() => void handleNidFromFile("back", "member")}
            busy={busy}
          />
        </View>
      ) : null}

      <View
        style={[
          styles.card,
          onboardingStep === "submit" && styles.cardHighlight,
        ]}
      >
        {awaitingOfficer ? (
          <>
            <Text style={styles.sectionTitle}>{copy.verificationPendingBanner}</Text>
            <Text style={styles.stepHint}>{copy.verificationPendingHint}</Text>
          </>
        ) : null}
        {submitState.readyToSubmit && !awaitingOfficer ? (
          <>
            <Text style={styles.sectionTitle}>{copy.readyToSubmitTitle}</Text>
            <Text style={styles.stepHint}>{copy.readyToSubmitHint}</Text>
          </>
        ) : null}
        {submitState.nidRejected && !awaitingOfficer ? (
          <Text style={styles.stepHint}>{copy.actionRequired.nid}</Text>
        ) : null}
        {submitState.canResubmit && !awaitingOfficer ? (
          <Text style={styles.stepHint}>{copy.actionRequired.biodata}</Text>
        ) : null}
        {onboardingStep === "submit" ? (
          <Text style={styles.stepHint}>{copy.onboardingStepSubmitHint}</Text>
        ) : null}
        {!submitState.packageComplete && !awaitingOfficer ? (
          <Text style={styles.hint}>{copy.packageIncompleteHint}</Text>
        ) : null}
        <Pressable
          style={[
            styles.submitButton,
            (busy || submitDisabled) && styles.disabled,
            media.isVerified && styles.submitVerified,
            awaitingReview && styles.submitPending,
          ]}
          onPress={() => void handleSubmitVerification()}
          disabled={submitDisabled}
        >
          <Text style={[styles.submitText, awaitingReview && styles.submitTextPending]}>
            {submitLabel}
          </Text>
        </Pressable>
      </View>

      {isOnboardingSetup ? (
        <Pressable
          style={[styles.continueButton, busy && styles.disabled]}
          onPress={() => void handleContinueSetup()}
          disabled={busy}
        >
          <Text style={styles.continueText}>{copy.continueToOverview}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function OnboardingMediaBanner({
  step,
  copy,
}: {
  step: OnboardingMediaStep;
  copy: ReturnType<typeof tProfileMedia>;
}) {
  const steps: { key: OnboardingMediaStep; label: string }[] = [
    { key: "primary", label: copy.onboardingStepPrimary },
    { key: "nidFront", label: copy.onboardingStepNidFront },
    { key: "nidBack", label: copy.onboardingStepNidBack },
    { key: "submit", label: copy.onboardingStepSubmit },
  ];

  return (
    <View style={styles.onboardingBanner}>
      <Text style={styles.onboardingTitle}>{copy.onboardingMediaTitle}</Text>
      <Text style={styles.onboardingIntro}>{copy.onboardingMediaIntro}</Text>
      {steps.map((item, index) => {
        const order: OnboardingMediaStep[] = [
          "primary",
          "nidFront",
          "nidBack",
          "submit",
          "complete",
        ];
        const isDone = order.indexOf(step) > order.indexOf(item.key);
        const isCurrent = step === item.key;

        return (
          <View
            key={item.key}
            style={[
              styles.onboardingStepRow,
              isCurrent && styles.onboardingStepCurrent,
            ]}
          >
            <Text style={styles.onboardingStepIndex}>{isDone ? "✓" : index + 1}</Text>
            <Text
              style={[
                styles.onboardingStepLabel,
                isCurrent && styles.onboardingStepLabelCurrent,
                isDone && styles.onboardingStepLabelDone,
              ]}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function StatusBadge({ status, compact }: { status: string; compact?: boolean }) {
  return (
    <Text style={[styles.badge, compact && styles.badgeCompact, badgeStyle(status)]}>
      {status}
    </Text>
  );
}

function badgeStyle(status: string) {
  if (status === "approved" || status === "verified") return styles.badgeOk;
  if (status === "rejected") return styles.badgeBad;
  return styles.badgePending;
}

function NidRow({
  label,
  status,
  hint,
  takePhotoLabel,
  chooseGalleryLabel,
  chooseFileLabel,
  onTakePhoto,
  onChooseGallery,
  onChooseFile,
  busy,
  emphasizeCamera,
}: {
  label: string;
  status?: string;
  hint?: string;
  takePhotoLabel: string;
  chooseGalleryLabel: string;
  chooseFileLabel: string;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
  onChooseFile: () => void;
  busy: boolean;
  emphasizeCamera?: boolean;
}) {
  return (
    <View style={styles.nidRow}>
      <View style={styles.nidInfo}>
        <Text style={styles.nidLabel}>{label}</Text>
        <Text style={styles.muted}>{status ?? "—"}</Text>
        {hint ? <Text style={styles.stepHint}>{hint}</Text> : null}
      </View>
      <View style={styles.nidActions}>
        <MediaCaptureActions
          takePhotoLabel={takePhotoLabel}
          chooseGalleryLabel={chooseGalleryLabel}
          chooseFileLabel={chooseFileLabel}
          onTakePhoto={onTakePhoto}
          onChooseGallery={onChooseGallery}
          onChooseFile={onChooseFile}
          disabled={busy}
          emphasizeCamera={emphasizeCamera}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 16,
  },
  cardHighlight: {
    borderColor: colors.rose800,
    borderWidth: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
    marginBottom: 10,
  },
  meta: { fontSize: 13, color: colors.zinc600, marginBottom: 4, textTransform: "capitalize" },
  muted: { fontSize: 13, color: colors.zinc500, textTransform: "capitalize" },
  hint: { marginTop: 10, fontSize: 12, lineHeight: 18, color: colors.zinc500 },
  stepHint: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.rose800,
    marginBottom: 10,
    fontWeight: "600",
  },
  onboardingBanner: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 16,
    gap: 8,
  },
  onboardingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.zinc900,
  },
  onboardingIntro: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.zinc600,
    marginBottom: 4,
  },
  onboardingStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  onboardingStepCurrent: {
    backgroundColor: colors.rose50,
  },
  onboardingStepIndex: {
    width: 22,
    textAlign: "center",
    fontWeight: "700",
    color: colors.rose800,
    fontSize: 13,
  },
  onboardingStepLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.zinc600,
  },
  onboardingStepLabelCurrent: {
    color: colors.zinc900,
    fontWeight: "700",
  },
  onboardingStepLabelDone: {
    color: colors.emerald600,
  },
  primaryPhoto: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 8,
  },
  galleryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  galleryItem: { width: "47%" },
  galleryPhoto: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    marginBottom: 4,
  },
  badge: {
    alignSelf: "flex-start",
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  badgeCompact: { marginTop: 4, marginBottom: 2 },
  badgeOk: { backgroundColor: "#ecfdf5", color: colors.emerald600 },
  badgeBad: { backgroundColor: "#fef2f2", color: colors.red600 },
  badgePending: { backgroundColor: "#fffbeb", color: "#b45309" },
  link: { fontSize: 12, fontWeight: "600", color: colors.rose800, marginTop: 2 },
  linkDanger: { fontSize: 12, fontWeight: "600", color: colors.red600, marginTop: 2 },
  nidRow: {
    marginBottom: 16,
    gap: 8,
  },
  nidInfo: { flex: 1 },
  nidActions: { width: "100%" },
  nidLabel: { fontSize: 14, fontWeight: "600", color: colors.zinc800 },
  submitButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitVerified: {
    backgroundColor: colors.emerald600,
  },
  submitPending: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  submitText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  submitTextPending: { color: "#92400e", fontSize: 16, fontWeight: "700" },
  continueButton: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    backgroundColor: colors.white,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueText: { color: colors.rose800, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  success: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    color: colors.emerald600,
    fontSize: 13,
    fontWeight: "600",
  },
  error: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
});
