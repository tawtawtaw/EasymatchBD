export type ChatEmojiCategoryId =
  | "smileys"
  | "gestures"
  | "hearts"
  | "nature"
  | "celebrate";

export type ChatEmojiCategory = {
  id: ChatEmojiCategoryId;
  icon: string;
  emojis: string[];
};

/** Curated, family-friendly set for matrimonial chat — not a full emoji keyboard. */
export const CHAT_EMOJI_CATEGORIES: ChatEmojiCategory[] = [
  {
    id: "smileys",
    icon: "😊",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😊",
      "🙂",
      "😇",
      "🥰",
      "😍",
      "🤗",
      "🤭",
      "😉",
      "😌",
      "😅",
      "😂",
      "🥲",
      "😋",
      "😎",
      "🤔",
      "😐",
      "😴",
      "😮",
      "😢",
      "😭",
      "😔",
      "🥺",
    ],
  },
  {
    id: "gestures",
    icon: "🙏",
    emojis: [
      "👋",
      "🤚",
      "👍",
      "👎",
      "👏",
      "🙏",
      "🤲",
      "🤝",
      "✌️",
      "🤞",
      "💪",
      "🫶",
      "🙌",
      "👌",
    ],
  },
  {
    id: "hearts",
    icon: "❤️",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🤍",
      "🩷",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "❣️",
      "🌹",
      "💐",
      "🌸",
      "🌺",
    ],
  },
  {
    id: "nature",
    icon: "🌿",
    emojis: [
      "☀️",
      "🌙",
      "⭐",
      "🌟",
      "✨",
      "🌈",
      "🌷",
      "🌻",
      "🍀",
      "🌿",
      "🍃",
      "🌊",
      "☁️",
      "🌼",
    ],
  },
  {
    id: "celebrate",
    icon: "🎉",
    emojis: [
      "🎉",
      "🎊",
      "🎁",
      "🥳",
      "🏆",
      "📝",
      "📖",
      "☕",
      "🍵",
      "🏠",
      "💍",
      "🕊️",
      "💬",
      "✅",
    ],
  },
];
