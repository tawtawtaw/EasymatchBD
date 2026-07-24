"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HOME_COUPLE_SLIDES, type HomeCoupleSlide } from "@/content/home-couple-slides";

const AUTOPLAY_MS = 5000;

type CouplesPhotoCarouselProps = {
  variant?: "section" | "hero";
  slides?: HomeCoupleSlide[];
};

export function CouplesPhotoCarousel({
  variant = "section",
  slides: slidesProp,
}: CouplesPhotoCarouselProps) {
  const t = useTranslations("publicHome.coupleGallery");
  const slides = slidesProp ?? HOME_COUPLE_SLIDES;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const isHero = variant === "hero";

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      const normalized = ((index % slides.length) + slides.length) % slides.length;
      setActiveIndex(normalized);
    },
    [slides.length],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    if (slides.length <= 1 || paused || reduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, slides.length]);

  if (slides.length === 0) return null;

  const carousel = (
    <div
      className={isHero ? "relative w-full" : "relative mx-auto mt-10 max-w-4xl"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div
        className={
          isHero
            ? "overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-xl backdrop-blur"
            : "overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-lg shadow-rose-100/60"
        }
      >
        <div
          className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide) => (
            <figure key={slide.id} className="relative min-w-full">
              <div
                className={
                  isHero
                    ? "relative aspect-[4/3] w-full bg-gradient-to-br from-rose-100 via-rose-50 to-amber-50"
                    : "relative aspect-[16/10] w-full bg-gradient-to-br from-rose-100 via-rose-50 to-amber-50 sm:aspect-[16/9]"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.imageSrc}
                  alt={t(slide.altKey)}
                  className="h-full w-full object-cover"
                  loading={isHero ? "eager" : "lazy"}
                  decoding="async"
                />
                <div
                  className={
                    isHero
                      ? "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-4 pb-4 pt-12"
                      : "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-5 pb-5 pt-16 sm:px-8 sm:pb-8"
                  }
                >
                  <figcaption
                    className={
                      isHero
                        ? "text-sm font-medium leading-snug text-white"
                        : "text-base font-medium text-white sm:text-lg"
                    }
                  >
                    {t(slide.captionKey)}
                  </figcaption>
                </div>
              </div>
            </figure>
          ))}
        </div>
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            className={
              isHero
                ? "absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/30 bg-black/35 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
                : "absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/30 bg-black/35 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/50 sm:left-4"
            }
            aria-label={t("prevSlide")}
          >
            <span aria-hidden className="block text-base leading-none">
              ‹
            </span>
          </button>
          <button
            type="button"
            onClick={goNext}
            className={
              isHero
                ? "absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/30 bg-black/35 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
                : "absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/30 bg-black/35 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/50 sm:right-4"
            }
            aria-label={t("nextSlide")}
          >
            <span aria-hidden className="block text-base leading-none">
              ›
            </span>
          </button>

          <div
            className={
              isHero
                ? "absolute inset-x-0 bottom-14 flex items-center justify-center gap-1.5"
                : "mt-4 flex items-center justify-center gap-2"
            }
            role="tablist"
            aria-label={t("slideIndicator")}
          >
            {slides.map((slide, index) => {
              const selected = index === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={t("goToSlide", { number: index + 1 })}
                  onClick={() => goTo(index)}
                  className={`rounded-full transition ${
                    isHero
                      ? selected
                        ? "h-2 w-6 bg-white"
                        : "h-2 w-2 bg-white/50 hover:bg-white/70"
                      : selected
                        ? "h-2.5 w-8 bg-rose-700"
                        : "h-2.5 w-2.5 bg-rose-200 hover:bg-rose-300"
                  }`}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );

  if (isHero) {
    return (
      <div
        id="couple-gallery"
        aria-label={t("title")}
        className="w-full"
      >
        {carousel}
      </div>
    );
  }

  return (
    <section
      id="couple-gallery"
      className="bg-gradient-to-b from-white to-rose-50/60 py-16"
      aria-labelledby="couple-gallery-title"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="couple-gallery-title" className="text-3xl font-bold text-zinc-900">
            {t("title")}
          </h2>
          <p className="mt-3 text-zinc-600">{t("subtitle")}</p>
        </div>
        {carousel}
      </div>
    </section>
  );
}
