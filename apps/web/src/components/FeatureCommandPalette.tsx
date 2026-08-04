"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { signOut } from "@/lib/auth-session";
import { useAuthSession } from "@/hooks/use-auth-session";
import { isStaffRole } from "@easymatch/shared";
import {
  MEMBER_FEATURE_GROUPS,
  MEMBER_FEATURES,
  type MemberFeatureDef,
  type MemberFeatureGroup,
} from "@/lib/member-features";

type FeatureCommandContextValue = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const FeatureCommandContext = createContext<FeatureCommandContextValue | null>(
  null,
);

export function useFeatureCommandPalette() {
  const ctx = useContext(FeatureCommandContext);
  if (!ctx) {
    throw new Error("useFeatureCommandPalette must be used within provider");
  }
  return ctx;
}

function featureMatchesQuery(
  feature: MemberFeatureDef,
  query: string,
  title: string,
  description: string,
) {
  if (!query.trim()) return true;
  const haystack = [
    title,
    description,
    feature.id,
    ...feature.keywords,
  ]
    .join(" ")
    .toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export function FeatureCommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, ready } = useAuthSession();
  const memberOnly = ready && user != null && !isStaffRole(user.role);
  const t = useTranslations("memberHome.command");
  const tf = useTranslations("memberHome.features");
  const tg = useTranslations("memberHome.groups");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const toggle = useCallback(() => {
    setOpen((value) => !value);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const filtered = useMemo(() => {
    return MEMBER_FEATURES.filter((feature) =>
      featureMatchesQuery(
        feature,
        query,
        tf(`${feature.id}.title`),
        tf(`${feature.id}.description`),
      ),
    );
  }, [query, tf]);

  const grouped = useMemo(() => {
    const map = new Map<MemberFeatureGroup, MemberFeatureDef[]>();
    for (const group of MEMBER_FEATURE_GROUPS) {
      map.set(group, []);
    }
    for (const feature of filtered) {
      map.get(feature.group)?.push(feature);
    }
    return MEMBER_FEATURE_GROUPS.map((group) => ({
      group,
      items: map.get(group) ?? [],
    })).filter((entry) => entry.items.length > 0);
  }, [filtered]);

  const flatItems = useMemo(
    () => grouped.flatMap((entry) => entry.items),
    [grouped],
  );

  const runFeature = useCallback(
    (feature: MemberFeatureDef) => {
      close();
      if (feature.action === "signOut") {
        signOut();
        router.replace("/auth");
        router.refresh();
        return;
      }
      if (feature.href) {
        router.push(feature.href);
      }
    },
    [close, router],
  );

  useEffect(() => {
    if (!memberOnly) return;

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      }
      if (event.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, toggle, memberOnly]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open || flatItems.length === 0) return;
    const node = listRef.current?.querySelector(
      `[data-cmd-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, flatItems.length, open]);

  let runningIndex = -1;

  return (
    <FeatureCommandContext.Provider value={{ open: openPalette, close, toggle }}>
      {children}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/40 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={close}
          role="presentation"
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
          >
            <div className="border-b border-zinc-100 px-4 py-3">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((index) =>
                      flatItems.length === 0
                        ? 0
                        : (index + 1) % flatItems.length,
                    );
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((index) =>
                      flatItems.length === 0
                        ? 0
                        : (index - 1 + flatItems.length) % flatItems.length,
                    );
                  }
                  if (event.key === "Enter" && flatItems[activeIndex]) {
                    event.preventDefault();
                    runFeature(flatItems[activeIndex]);
                  }
                }}
                placeholder={t("placeholder")}
                className="w-full bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              <p className="mt-2 text-xs text-zinc-500">{t("hint")}</p>
            </div>
            <div ref={listRef} className="max-h-[min(420px,50vh)] overflow-y-auto p-2">
              {flatItems.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-zinc-500">
                  {t("empty")}
                </p>
              ) : (
                grouped.map(({ group, items }) => (
                  <div key={group} className="mb-2">
                    <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {tg(group)}
                    </p>
                    <ul>
                      {items.map((feature) => {
                        runningIndex += 1;
                        const index = runningIndex;
                        const isActive = index === activeIndex;
                        return (
                          <li key={feature.id}>
                            <button
                              type="button"
                              data-cmd-index={index}
                              onMouseEnter={() => setActiveIndex(index)}
                              onClick={() => runFeature(feature)}
                              className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                isActive
                                  ? "bg-rose-50 text-rose-950"
                                  : "text-zinc-800 hover:bg-zinc-50"
                              }`}
                            >
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm ring-1 ring-zinc-200">
                                {tf(`${feature.id}.icon`)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">
                                  {tf(`${feature.id}.title`)}
                                </span>
                                <span className="block text-xs text-zinc-500">
                                  {tf(`${feature.id}.description`)}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </FeatureCommandContext.Provider>
  );
}

export function FeatureCommandTrigger({
  className = "",
  variant = "default",
  layout = "inline",
}: {
  className?: string;
  variant?: "default" | "hero";
  layout?: "inline" | "stack";
}) {
  const { open } = useFeatureCommandPalette();
  const t = useTranslations("memberHome.command");

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={open}
        className={`flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3.5 text-left shadow-sm transition hover:border-rose-200 hover:shadow-md ${className}`}
      >
        <span className="text-zinc-400">⌘</span>
        <span className="flex-1 text-sm text-zinc-500">{t("placeholder")}</span>
        <kbd className="hidden rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-500 sm:inline">
          Ctrl K
        </kbd>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`${
        layout === "stack"
          ? "flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-900"
          : "hidden items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-900 sm:inline-flex"
      } ${className}`}
      title={t("title")}
    >
      <span>{t("shortLabel")}</span>
      <kbd className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
