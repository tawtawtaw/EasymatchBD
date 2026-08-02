import { create } from "zustand";
import { isVerificationAwaitingOfficer } from "../lib/verification-submit-state";
import { reconcileVerificationFeedbackWithMedia } from "../lib/verification-feedback";
import { invalidateDedupeCache } from "../services/api/dedupe";
import { getProfileMedia, invalidateProfileMediaCaches } from "../services/media";
import { useAuthStore } from "./authStore";
import type { ProfileMedia, VerificationFeedback } from "../types/media";

let cachedMedia: ProfileMedia | null = null;
let cachedUserId: string | null = null;
let inflight: Promise<ProfileMedia> | null = null;
let syncInFlight: Promise<void> | null = null;

export function clearMemberVerificationMediaCache() {
  cachedMedia = null;
  cachedUserId = null;
  inflight = null;
}

function readAuthVerified() {
  const { session, user } = useAuthStore.getState();
  return (
    session?.isVerified ??
    user?.profile?.isVerified ??
    user?.isVerified ??
    false
  );
}

function isMediaVerified(media: ProfileMedia) {
  return media.isVerified || media.verificationFeedback?.isFullyVerified === true;
}

async function loadVerificationMedia(userId: string, force = false) {
  if (force) {
    cachedMedia = null;
    cachedUserId = null;
    inflight = null;
    invalidateProfileMediaCaches();
  }

  if (!force && cachedUserId === userId && cachedMedia) {
    return cachedMedia;
  }

  if (inflight && !force) {
    return inflight;
  }

  const fetchPromise = getProfileMedia({ forceFresh: force || !cachedMedia }).then(
    (media) => {
      if (inflight === fetchPromise) {
        cachedMedia = media;
        cachedUserId = userId;
        inflight = null;
      }
      return media;
    },
  );

  inflight = fetchPromise;

  try {
    return await fetchPromise;
  } catch (error) {
    if (inflight === fetchPromise) {
      inflight = null;
    }
    throw error;
  }
}

type MemberVerificationState = {
  mediaVerified: boolean;
  awaitingOfficer: boolean;
  verificationFeedback: VerificationFeedback | null;
  loading: boolean;
  sync: (forceFresh?: boolean) => Promise<void>;
};

export const useMemberVerificationStore = create<MemberVerificationState>((set) => ({
    mediaVerified: false,
    awaitingOfficer: false,
    verificationFeedback: null,
    loading: false,

    sync: async (forceFresh = false) => {
      const userId = useAuthStore.getState().user?.id ?? null;
      if (!userId) {
        set({
          mediaVerified: false,
          awaitingOfficer: false,
          verificationFeedback: null,
          loading: false,
        });
        return;
      }

      if (syncInFlight && !forceFresh) {
        return syncInFlight;
      }

      const run = (async () => {
        if (!readAuthVerified() || forceFresh) {
          try {
            invalidateDedupeCache("auth:");
            await useAuthStore.getState().refreshSession();
          } catch {
            // continue with media fetch
          }
        }

        if (readAuthVerified()) {
          set({
            mediaVerified: true,
            awaitingOfficer: false,
            verificationFeedback: null,
            loading: false,
          });
          return;
        }

        if (forceFresh || !cachedMedia || cachedUserId !== userId) {
          clearMemberVerificationMediaCache();
        }

        set({ loading: true });
        try {
          const media = await loadVerificationMedia(userId, forceFresh);
          const fromMedia = isMediaVerified(media);
          set({
            mediaVerified: fromMedia,
            awaitingOfficer: fromMedia
              ? false
              : isVerificationAwaitingOfficer(media),
            verificationFeedback: reconcileVerificationFeedbackWithMedia(media),
            loading: false,
          });
          if (fromMedia && !readAuthVerified()) {
            void useAuthStore.getState().refreshSession();
          }
        } catch {
          set({
            mediaVerified: false,
            awaitingOfficer: false,
            verificationFeedback: null,
            loading: false,
          });
        }
      })();

      syncInFlight = run.finally(() => {
        syncInFlight = null;
      });

      return syncInFlight;
    },
  }));
