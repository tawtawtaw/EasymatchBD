import type { AppLocale } from "../lib/locale";

const comparison = {
  en: {
    title: "Compatibility comparison",
    subtitle: "How {you} and {other} align on partner expectations vs actual attributes.",
    loadError: "Could not load comparison",
    backToProfile: "← Back to profile",
    you: "You",
    member: "Member",
    profileRef: "Profile {code}",
    mutualScore: "Mutual fit",
    youExpectFromThem: "You → them",
    theyExpectFromYou: "Them → you",
    hiddenShort: "Hidden",
    otherPreferencesHiddenHint:
      "Their partner expectations are not visible at your current privacy level. You can still see how they match your expectations.",
    otherPreferencesHidden:
      "Their partner expectations are not shared at your current privacy level.",
    noCriteria:
      "No comparable criteria are set yet. Complete partner preferences to get a meaningful comparison.",
    tabViewerToOther: "What you expect from {other}",
    tabOtherToViewer: "What {other} expects from you",
    viewerToOtherTitle: "Your expectations vs their profile",
    otherToViewerTitle: "Their expectations vs your profile",
    directionScore: "{score}% match ({matched}/{total} criteria)",
    maritalAlignmentTitle: "Marital expectations alignment",
    maritalAlignmentSubtitle: "How your marital expectations compare with {other}.",
    maritalAlignmentScore: "{score}% aligned ({matched}/{total} criteria)",
    maritalAlignmentNoCriteria:
      "No marital expectation fields are filled in by both members yet.",
    expectation: "Expectation",
    theirValue: "Their value",
    yourValue: "Your value",
    hidden: "Hidden",
    criteria: {
      age: "Age",
      height: "Height",
      weight: "Weight",
      district: "District",
      education: "Education",
      profession: "Profession",
      marital_status: "Marital status",
      religion: "Religion",
      beard: "Beard",
      prayer: "Prayer practice",
      hijab: "Hijab practice",
    },
    maritalCriteria: {
      expected_marriage_timeline: "Expected marriage timeline",
      expected_parenthood_timeline: "Expected parenthood timeline",
      wedding_ceremony_preference: "Wedding ceremony preference",
      expected_kabin_amount: "Expected kabin amount (BDT)",
      living_arrangements: "Living arrangements",
    },
    status: {
      match: "Match",
      mismatch: "Mismatch",
      unknown: "Unknown",
      not_set: "Not specified",
      not_applicable: "N/A",
    },
  },
  bn: {
    title: "সামঞ্জস্য তুলনা",
    subtitle: "{you} ও {other}-এর পছন্দের সঙ্গী বনাম প্রকৃত গুণাবলী কতটা মিলে।",
    loadError: "তুলনা লোড করা যায়নি",
    backToProfile: "← প্রোফাইলে ফিরুন",
    you: "আপনি",
    member: "সদস্য",
    profileRef: "প্রোফাইল {code}",
    mutualScore: "পারস্পরিক মিল",
    youExpectFromThem: "আপনি → তাদের",
    theyExpectFromYou: "তারা → আপনি",
    hiddenShort: "লুকানো",
    otherPreferencesHiddenHint:
      "আপনার বর্তমান গোপনীয়তা স্তরে তাদের পছন্দের সঙ্গী দেখা যাচ্ছে না। তারা আপনার প্রত্যাশা কতটা পূরণ করে তা এখনও দেখতে পারবেন।",
    otherPreferencesHidden:
      "আপনার বর্তমান গোপনীয়তা স্তরে তাদের পছন্দের সঙ্গী শেয়ার করা হয়নি।",
    noCriteria:
      "এখনো তুলনাযোগ্য মানদণ্ড সেট নেই। অর্থপূর্ণ তুলনার জন্য পছন্দের সঙ্গী সম্পূর্ণ করুন।",
    tabViewerToOther: "আপনি {other} থেকে কী প্রত্যাশা করেন",
    tabOtherToViewer: "{other} আপনার থেকে কী প্রত্যাশা করেন",
    viewerToOtherTitle: "আপনার প্রত্যাশা বনাম তাদের প্রোফাইল",
    otherToViewerTitle: "তাদের প্রত্যাশা বনাম আপনার প্রোফাইল",
    directionScore: "{score}% মিল ({matched}/{total} মানদণ্ড)",
    maritalAlignmentTitle: "বৈবাহিক প্রত্যাশার মিল",
    maritalAlignmentSubtitle: "আপনার ও {other}-এর বৈবাহিক প্রত্যাশা কতটা মিলে।",
    maritalAlignmentScore: "{score}% মিল ({matched}/{total} মানদণ্ড)",
    maritalAlignmentNoCriteria:
      "উভয় সদস্যের পক্ষ থেকে এখনো কোনো বৈবাহিক প্রত্যাশার ক্ষেত্র পূরণ করা হয়নি।",
    expectation: "প্রত্যাশা",
    theirValue: "তাদের মান",
    yourValue: "আপনার মান",
    hidden: "লুকানো",
    criteria: {
      age: "বয়স",
      height: "উচ্চতা",
      weight: "ওজন",
      district: "জেলা",
      education: "শিক্ষা",
      profession: "পেশা",
      marital_status: "বৈবাহিক অবস্থা",
      religion: "ধর্ম",
      beard: "দাড়ি",
      prayer: "নামাজের অভ্যাস",
      hijab: "হিজাবের অভ্যাস",
    },
    maritalCriteria: {
      expected_marriage_timeline: "প্রত্যাশিত বিয়ের সময়সীমা",
      expected_parenthood_timeline: "সন্তান গ্রহণের প্রত্যাশিত সময়",
      wedding_ceremony_preference: "বিবাহ অনুষ্ঠানের পছন্দ",
      expected_kabin_amount: "প্রত্যাশিত কাবিন (টাকায়)",
      living_arrangements: "বসবাসের ব্যবস্থা",
    },
    status: {
      match: "মিল",
      mismatch: "অমিল",
      unknown: "অজানা",
      not_set: "নির্দিষ্ট নয়",
      not_applicable: "প্রযোজ্য নয়",
    },
  },
} as const;

export type ComparisonCopy = (typeof comparison)[AppLocale];

export function tComparison(locale: AppLocale) {
  return comparison[locale];
}

export function fillComparisonTemplate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}
