"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CHAT_EMOJI_CATEGORIES,
  type ChatEmojiCategoryId,
} from "@/lib/chat-emojis";

type Props = {
  disabled?: boolean;
  onSelect: (emoji: string) => void;
};

const iconButtonClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-zinc-600 hover:bg-zinc-200/80 disabled:opacity-60";

export function EmojiPickerButton({ disabled, onSelect }: Props) {
  const t = useTranslations("messages");
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<ChatEmojiCategoryId>("smileys");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const category =
    CHAT_EMOJI_CATEGORIES.find((item) => item.id === categoryId) ??
    CHAT_EMOJI_CATEGORIES[0];

  return (
    <div className="relative shrink-0 self-end" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        aria-label={t("emojiPicker")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={iconButtonClass}
        title={t("emojiPicker")}
      >
        😊
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={t("emojiPicker")}
          className="absolute bottom-full left-0 z-30 mb-2 w-[min(18.5rem,calc(100vw-2rem))] rounded-xl border border-zinc-200 bg-white p-2 shadow-lg"
        >
          <div className="mb-2 flex gap-1 border-b border-zinc-100 pb-2">
            {CHAT_EMOJI_CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategoryId(item.id)}
                className={`flex h-8 flex-1 items-center justify-center rounded-lg text-base ${
                  item.id === categoryId
                    ? "bg-rose-50 ring-1 ring-rose-200"
                    : "hover:bg-zinc-50"
                }`}
                aria-label={t(`emojiCategory.${item.id}`)}
                title={t(`emojiCategory.${item.id}`)}
              >
                {item.icon}
              </button>
            ))}
          </div>
          <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto">
            {category.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSelect(emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-rose-50"
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
