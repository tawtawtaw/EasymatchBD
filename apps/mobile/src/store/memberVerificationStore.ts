import { create } from "zustand";
import { isVerificationAwaitingOfficer } from "../lib/verification-submit-state";
import { invalidateDedupeCache } from "../services/api/dedupe";
import { getProfileMedia } from "../services/media";
import { useAuthStore } from "./authStore";
import type { ProfileMedia } from "../types/media";

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
  }

  if (!force && cachedUserId === userId && cachedMedia) {
    return cachedMedia;
  }

  if (inflight) {
    return inflight;
  }

  inflight = getProfileMedia().then((media) => {
    cachedMedia = media;
    cachedUserId = userId;
    inflight = null;
    return media;
  });

  try {
    return await inflight;
  } catch (error) {
    inflight = null;
    throw error;
  }
}

type MemberVerificationState = {
  mediaVerified: boolean;
  awaitingOfficer: boolean;
  loading: boolean;
  sync: (forceFresh?: boolean) => Promise<void>;
};

export const useMemberVerificationStore = create<MemberVerificationState>(
  (set, get) => ({
    mediaVerified: false,
    awaitingOfficer: false,
    loading: false,

    sync: async (forceFresh = false) => {
      const userId = useAuthStore.getState().user?.id ?? null;
      if (!userId) {
        set({ mediaVerified: false, awaitingOfficer: false, loading: false });
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
          set({ mediaVerified: true, awaitingOfficer: false, loading: false });
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
            loading: false,
          });
          if (fromMedia && !readAuthVerified()) {
            void useAuthStore.getState().refreshSession();
          }
        } catch {
          set({ mediaVerified: false, awaitingOfficer: false, loading: false });
        }
      })();

      syncInFlight = run.finally(() => {
        syncInFlight = null;
      });

      return syncInFlight;
    },
  }),
);
