export const MEMBER_FEATURE_GROUPS = [
  "match",
  "communicate",
  "profile",
  "documents",
  "account",
] as const;

export type MemberFeatureGroup = (typeof MEMBER_FEATURE_GROUPS)[number];

export type MemberFeatureId =
  | "memberHome"
  | "browseDiscovery"
  | "savedProfiles"
  | "compareProfiles"
  | "incomingInterests"
  | "outgoingInterests"
  | "connections"
  | "messages"
  | "videoCalls"
  | "editProfile"
  | "partnerPreferences"
  | "profilePhotos"
  | "biodataExport"
  | "membership"
  | "fileComplaint"
  | "terms"
  | "signOut";

export type MemberFeatureDef = {
  id: MemberFeatureId;
  group: MemberFeatureGroup;
  href?: string;
  action?: "signOut";
  keywords: string[];
};

export const MEMBER_FEATURES: MemberFeatureDef[] = [
  {
    id: "memberHome",
    group: "account",
    href: "/home",
    keywords: ["home", "dashboard", "start"],
  },
  {
    id: "browseDiscovery",
    group: "match",
    href: "/discovery",
    keywords: ["browse", "search", "profiles", "matrimonial", "match"],
  },
  {
    id: "savedProfiles",
    group: "match",
    href: "/discovery/saved",
    keywords: [
      "saved",
      "bookmarked",
      "bookmark",
      "reference",
      "shortlist",
      "favorites",
    ],
  },
  {
    id: "compareProfiles",
    group: "match",
    href: "/discovery",
    keywords: [
      "compare",
      "comparison",
      "compatibility",
      "matrix",
      "match",
      "expectations",
    ],
  },
  {
    id: "incomingInterests",
    group: "match",
    href: "/connections?tab=incoming",
    keywords: ["incoming", "interest", "requests", "received", "proposals"],
  },
  {
    id: "outgoingInterests",
    group: "match",
    href: "/connections?tab=outgoing",
    keywords: ["outgoing", "sent", "interest", "pending", "proposals"],
  },
  {
    id: "connections",
    group: "match",
    href: "/connections",
    keywords: ["connections", "matches", "mutual", "connected"],
  },
  {
    id: "messages",
    group: "communicate",
    href: "/messages",
    keywords: ["messages", "chat", "inbox", "conversation"],
  },
  {
    id: "videoCalls",
    group: "communicate",
    href: "/video-calls",
    keywords: [
      "video",
      "call",
      "video call",
      "schedule",
      "reschedule",
      "cancel",
      "webcam",
      "camera",
      "meet",
    ],
  },
  {
    id: "editProfile",
    group: "profile",
    href: "/profile",
    keywords: ["profile", "edit", "personal", "biodata", "family"],
  },
  {
    id: "partnerPreferences",
    group: "profile",
    href: "/profile",
    keywords: ["partner", "preferences", "criteria", "match"],
  },
  {
    id: "profilePhotos",
    group: "profile",
    href: "/profile",
    keywords: ["photos", "pictures", "gallery", "nid"],
  },
  {
    id: "biodataExport",
    group: "documents",
    href: "/profile/biodata",
    keywords: ["biodata", "pdf", "download", "export", "print"],
  },
  {
    id: "membership",
    group: "account",
    href: "/membership",
    keywords: ["membership", "paid", "upgrade", "subscription", "plan"],
  },
  {
    id: "fileComplaint",
    group: "account",
    href: "/complaints",
    keywords: ["complaint", "report", "misconduct", "harassment", "profile id"],
  },
  {
    id: "terms",
    group: "documents",
    href: "/terms",
    keywords: ["terms", "conditions", "legal", "policy"],
  },
  {
    id: "signOut",
    group: "account",
    action: "signOut",
    keywords: ["sign out", "logout", "exit"],
  },
];
