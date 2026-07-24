"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { MembershipTariff } from "@easymatch/shared";
import { formatTariffPriceBdt } from "@easymatch/shared";
import type { DropdownMap } from "@/lib/api";
import { PublicBrowseProfileCard } from "@/components/PublicBrowseProfileCard";
import { CouplesPhotoCarousel } from "@/components/CouplesPhotoCarousel";
import { HOME_GALLERY_SLIDES } from "@/content/home-gallery-slides";
import {
  HOME_MARKETING_IMAGES,
  HOME_TESTIMONIAL_IMAGES,
} from "@/content/home-marketing-images";
import {
  getPublicPlatformStats,
  type PublicBrowseListItem,
} from "@/lib/public-browse";

type PublicMarketingHomeProps = {
  dropdowns: DropdownMap;
  featuredProfiles: PublicBrowseListItem[];
  verifiedProfileCount: number;
  tariffs: MembershipTariff[];
};

export function PublicMarketingHome({
  dropdowns,
  featuredProfiles,
  verifiedProfileCount,
  tariffs,
}: PublicMarketingHomeProps) {
  const t = useTranslations("publicHome");
  const locale = useLocale();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [verifiedCount, setVerifiedCount] = useState(verifiedProfileCount);

  useEffect(() => {
    setVerifiedCount(verifiedProfileCount);
  }, [verifiedProfileCount]);

  useEffect(() => {
    if (verifiedProfileCount > 0) {
      return;
    }

    let cancelled = false;

    async function refreshVerifiedCount() {
      try {
        const stats = await getPublicPlatformStats();
        if (!cancelled && stats.verifiedProfileCount > 0) {
          setVerifiedCount(stats.verifiedProfileCount);
        }
      } catch {
        // keep server-rendered count on failure
      }
    }

    const deferTimer = window.setTimeout(() => {
      void refreshVerifiedCount();
    }, 5_000);
    const interval = window.setInterval(() => void refreshVerifiedCount(), 5 * 60_000);

    return () => {
      cancelled = true;
      window.clearTimeout(deferTimer);
      window.clearInterval(interval);
    };
  }, [verifiedProfileCount]);

  const stepKeys = [
    "register",
    "biodata",
    "search",
    "sendInterest",
    "acceptInterest",
    "connectFamilies",
  ] as const;

  const steps = stepKeys.map((key) => ({
    title: t(`steps.${key}.title`),
    body: t(`steps.${key}.body`),
  }));

  const trustKeys = [
    "otp",
    "review",
    "sharing",
    "reportBlock",
    "privacyDesign",
  ] as const;

  const trustItems = trustKeys.map((key) => ({
    title: t(`trust.items.${key}.title`),
    body: t(`trust.items.${key}.body`),
  }));

  const stats = [
    {
      value:
        verifiedCount > 0
          ? verifiedCount.toLocaleString(locale === "bn" ? "bn-BD" : "en-GB")
          : t("stats.verifiedFallback"),
      label: t("stats.verifiedProfiles"),
    },
    { value: t("stats.divisionsValue"), label: t("stats.divisions") },
    { value: "4", label: t("stats.privacyStages") },
    { value: t("stats.otpValue"), label: t("stats.secureLogin") },
  ];

  const privacyLevelKeys = ["1", "2", "3", "4"] as const;

  const privacyLevels = privacyLevelKeys.map((level) => ({
    level,
    label: t(`privacyLevels.items.${level}.label`),
    body: t(`privacyLevels.items.${level}.body`),
  }));

  const stories = ["one", "two", "three"] as const;
  const faqItems = ["browse", "photos", "membership", "verification", "privacy"] as const;

  const activeTariffs = tariffs
    .filter((tariff) => tariff.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function tariffLabel(tariff: MembershipTariff) {
    return locale === "bn" && tariff.labelBn ? tariff.labelBn : tariff.labelEn;
  }

  function tariffDescription(tariff: MembershipTariff) {
    return locale === "bn" && tariff.descriptionBn
      ? tariff.descriptionBn
      : tariff.descriptionEn;
  }

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section id="hero" className="relative bg-gradient-to-br from-rose-700 via-rose-600 to-amber-500 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-300/40 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="space-y-5">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {t("kicker")}
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t("headline")}
            </h1>
            <p className="max-w-xl text-lg text-rose-50/95">{t("subheadline")}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50"
              >
                {t("browseCta")}
              </Link>
              <Link
                href="/auth"
                className="inline-flex rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                {t("joinCta")}
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -right-4 -top-4 h-full w-full rounded-3xl bg-emerald-400/30 blur-2xl" />
            <CouplesPhotoCarousel variant="hero" />
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section id="statistics" className="border-b border-zinc-100 bg-white py-12">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white px-5 py-6 text-center"
            >
              <p className="text-3xl font-bold text-rose-800">{stat.value}</p>
              <p className="mt-2 text-sm font-medium text-zinc-700">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Families Trust EasymatchBD */}
      <section id="trust" className="bg-gradient-to-b from-rose-50/80 to-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-zinc-900">{t("trustTitle")}</h2>
            <p className="mt-3 text-zinc-600">{t("trustSubtitle")}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {trustItems.map((item) => (
              <article
                key={item.title}
                className="flex h-full flex-col rounded-2xl border border-rose-100 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  ✓
                </div>
                <h3 className="font-semibold leading-snug text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-zinc-900">{t("howTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-600">{t("howSubtitle")}</p>

          <div className="mx-auto mt-10 flex max-w-xl flex-col">
            {steps.map((step, index) => (
              <div key={step.title}>
                <article className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-700 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{step.body}</p>
                  </div>
                </article>
                {index < steps.length - 1 ? (
                  <div className="flex justify-center py-3 text-xl font-light text-rose-400" aria-hidden>
                    ↓
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HOME_MARKETING_IMAGES.howItWorks.src}
              alt={t(`marketingImages.${HOME_MARKETING_IMAGES.howItWorks.altKey}`)}
              className="h-auto w-full"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* How Privacy Works */}
      <section id="privacy-levels" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-zinc-900">{t("privacyLevels.title")}</h2>
          <p className="mt-3 text-zinc-600">{t("privacyLevels.subtitle")}</p>
        </div>
        <div className="mx-auto mt-10 flex max-w-xl flex-col">
          {privacyLevels.map((item, index) => (
            <div key={item.level}>
              <article className="flex gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                  {item.level}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    {t("privacyLevels.levelLabel", { level: item.level })}
                  </p>
                  <h3 className="mt-1 font-semibold text-zinc-900">{item.label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{item.body}</p>
                </div>
              </article>
              {index < privacyLevels.length - 1 ? (
                <div className="flex justify-center py-3 text-xl font-light text-emerald-400" aria-hidden>
                  ↓
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/privacy/fields"
            className="inline-flex rounded-full border border-emerald-300 bg-white px-6 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            {t("privacyLevels.fieldGuideCta")}
          </Link>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HOME_MARKETING_IMAGES.privacyWorks.src}
            alt={t(`marketingImages.${HOME_MARKETING_IMAGES.privacyWorks.altKey}`)}
            className="h-auto w-full rounded-3xl border border-emerald-100 bg-white shadow-lg"
            loading="lazy"
            decoding="async"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HOME_MARKETING_IMAGES.privacyBangali.src}
            alt={t(`marketingImages.${HOME_MARKETING_IMAGES.privacyBangali.altKey}`)}
            className="h-auto w-full rounded-3xl border border-emerald-100 bg-white shadow-lg"
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      <CouplesPhotoCarousel variant="section" slides={HOME_GALLERY_SLIDES} />

      {/* Featured Verified Profiles */}
      <section id="featured-profiles" className="bg-gradient-to-b from-rose-50/80 to-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-zinc-900">{t("featured.title")}</h2>
              <p className="mt-2 max-w-2xl text-zinc-600">{t("featured.subtitle")}</p>
            </div>
            <Link
              href="/browse"
              className="text-sm font-semibold text-rose-800 hover:underline"
            >
              {t("featured.seeAll")} →
            </Link>
          </div>
          {featuredProfiles.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProfiles.map((item) => (
                <PublicBrowseProfileCard
                  key={item.profileId}
                  item={item}
                  dropdowns={dropdowns}
                />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-600">
              {t("featured.empty")}
            </p>
          )}
        </div>
      </section>

      {/* Success Stories */}
      <section id="success-stories" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-zinc-900">{t("stories.title")}</h2>
          <p className="mt-3 text-zinc-600">{t("stories.subtitle")}</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {HOME_TESTIMONIAL_IMAGES.map((item) => (
            <figure
              key={item.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={t(`stories.${item.altKey}`)}
                className="h-auto w-full"
                loading="lazy"
                decoding="async"
              />
            </figure>
          ))}
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {stories.map((key) => (
            <blockquote
              key={key}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm leading-relaxed text-zinc-700">
                &ldquo;{t(`stories.items.${key}.quote`)}&rdquo;
              </p>
              <footer className="mt-4 border-t border-zinc-100 pt-4">
                <p className="text-sm font-semibold text-zinc-900">
                  {t(`stories.items.${key}.name`)}
                </p>
                <p className="text-xs text-zinc-500">{t(`stories.items.${key}.meta`)}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* Membership Plans */}
      <section id="membership" className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-zinc-900">{t("membership.title")}</h2>
            <p className="mt-3 text-zinc-600">{t("membership.subtitle")}</p>
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <h3 className="font-semibold text-emerald-900">{t("membership.freeTitle")}</h3>
            <p className="mt-2 text-sm text-emerald-800">{t("membership.freeBody")}</p>
          </div>

          {activeTariffs.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {activeTariffs.map((tariff) => (
                <article
                  key={tariff.id}
                  className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-xl font-bold text-zinc-900">{tariffLabel(tariff)}</h3>
                  {tariffDescription(tariff) ? (
                    <p className="mt-2 text-sm text-zinc-600">{tariffDescription(tariff)}</p>
                  ) : null}
                  <p className="mt-4 text-3xl font-bold text-rose-800">
                    ৳{formatTariffPriceBdt(tariff.priceBdt)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {t("membership.durationDays", { days: tariff.durationDays })}
                  </p>
                  <Link
                    href="/membership"
                    className="mt-6 inline-flex justify-center rounded-full bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"
                  >
                    {t("membership.viewPlan")}
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-zinc-600">{t("membership.plansLoading")}</p>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-zinc-900">{t("faq.title")}</h2>
          <p className="mt-3 text-zinc-600">{t("faq.subtitle")}</p>
        </div>
        <div className="mt-8 space-y-3">
          {faqItems.map((key, index) => {
            const isOpen = openFaq === index;
            return (
              <article
                key={key}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-zinc-900">
                    {t(`faq.items.${key}.question`)}
                  </span>
                  <span className="text-rose-700">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen ? (
                  <div className="border-t border-zinc-100 px-5 py-4 text-sm leading-relaxed text-zinc-600">
                    {t(`faq.items.${key}.answer`)}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {/* Final CTA (above layout footer) */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-rose-700 to-amber-600 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-3xl font-bold">{t("finalCta.title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-rose-50">{t("finalCta.body")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/browse"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50"
            >
              {t("browseCta")}
            </Link>
            <Link
              href="/auth"
              className="inline-flex rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              {t("joinCta")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
