import { create } from "zustand";
import {
  getMemberProfileSummary,
  type MemberProfileSummary,
} from "../services/member-profile";

type MemberProfileState = {
  summary: MemberProfileSummary | null;
  setSummary: (summary: MemberProfileSummary) => void;
  clear: () => void;
  /**
   * Fills the cache for chrome that needs the member's own avatar but has no
   * screen of its own to load it. Screens that already fetch the profile push
   * it in via setSummary, so this usually never reaches the network.
   */
  ensureLoaded: () => Promise<void>;
};

let inFlight: Promise<void> | null = null;

export const useMemberProfileStore = create<MemberProfileState>((set, get) => ({
  summary: null,

  setSummary: (summary) => set({ summary }),

  clear: () => set({ summary: null }),

  ensureLoaded: async () => {
    if (get().summary) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        set({ summary: await getMemberProfileSummary() });
      } catch {
        // The avatar falls back to an initial, so a failure here is invisible.
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  },
}));
