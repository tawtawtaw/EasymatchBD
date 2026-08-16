import type { AppLocale } from "../lib/locale";

const terms = {
  en: {
    pageTitle: "Terms and Conditions",
    profileGateHint:
      "You must read and accept these Terms and Conditions before creating your matrimonial profile.",
    readConfirm:
      "I have read and understood the Terms and Conditions and agree to be bound by them.",
    agree: "I Agree",
    decline: "Decline",
    accepting: "Accepting…",
    declining: "Recording…",
    declineNote:
      "If you decline, you cannot create a profile or use matrimonial services on the Platform.",
    effectiveDate: "Effective date: {date}",
    version: "Terms version {version}",
    loadError: "Could not load terms",
    acceptError: "Could not accept terms",
    declineError: "Could not record decline",
    updatedNotice:
      "Our terms were updated (previous: {previous}, current: {current}). Please read and accept again.",
    declinedTitle: "Terms not accepted",
    declinedMessage:
      "You chose not to accept the Terms and Conditions. You cannot create a profile without accepting them.",
    reviewAgain: "Review terms again",
    signOut: "Sign out",
  },
  bn: {
    pageTitle: "শর্তাবলী",
    profileGateHint:
      "বিবাহের প্রোফাইল তৈরির আগে আপনাকে এই শর্তাবলী পড়তে এবং গ্রহণ করতে হবে।",
    readConfirm: "আমি শর্তাবলী পড়েছি, বুঝেছি এবং মেনে চলতে সম্মত।",
    agree: "আমি সম্মত",
    decline: "প্রত্যাখ্যান",
    accepting: "গ্রহণ করা হচ্ছে…",
    declining: "রেকর্ড করা হচ্ছে…",
    declineNote:
      "প্রত্যাখ্যান করলে আপনি প্রোফাইল তৈরি বা matrimonial সেবা ব্যবহার করতে পারবেন না।",
    effectiveDate: "কার্যকর তারিখ: {date}",
    version: "শর্ত সংস্করণ {version}",
    loadError: "শর্তাবলী লোড করা যায়নি",
    acceptError: "শর্ত গ্রহণ করা যায়নি",
    declineError: "প্রত্যাখ্যান রেকর্ড করা যায়নি",
    updatedNotice:
      "শর্তাবলী আপডেট হয়েছে (পূর্ববর্তী: {previous}, বর্তমান: {current})। অনুগ্রহ করে পুনরায় পড়ে গ্রহণ করুন।",
    declinedTitle: "শর্ত গ্রহণ করা হয়নি",
    declinedMessage:
      "আপনি শর্তাবলী গ্রহণ করেননি। গ্রহণ ছাড়া প্রোফাইল তৈরি করা যাবে না।",
    reviewAgain: "আবার শর্ত দেখুন",
    signOut: "সাইন আউট",
  },
} as const;

const creationIntent = {
  en: {
    title: "Who is this profile for?",
    subtitle:
      "Choose once before you start. This affects which NID documents are required for verification.",
    selfTitle: "For myself",
    selfDescription:
      "I am creating this profile for myself. The usual verification process applies.",
    onBehalfTitle: "For someone else",
    onBehalfDescription:
      "I am creating this profile for my son, daughter, or a relative.",
    relationLabel: "I am creating this profile on behalf of",
    relationPlaceholder: "Select relationship",
    relationRequired: "Please select who this profile is for.",
    onBehalfNidHint:
      "You must upload your own NID for verification. The member's NID is optional.",
    saveFailed: "Could not save your choice. Please try again.",
    saving: "Saving…",
    continue: "Continue to profile",
    relations: {
      my_son: "My son",
      my_daughter: "My daughter",
      my_relative: "My relatives",
      someone_else: "For someone else",
    },
  },
  bn: {
    title: "এই প্রোফাইল কার জন্য?",
    subtitle:
      "শুরু করার আগে একবার বেছে নিন। যাচাইয়ের জন্য কোন NID লাগবে তা এর উপর নির্ভর করে।",
    selfTitle: "নিজের জন্য",
    selfDescription: "আমি নিজের জন্য প্রোফাইল তৈরি করছি। সাধারণ যাচাই প্রক্রিয়া প্রযোজ্য।",
    onBehalfTitle: "অন্য কারও জন্য",
    onBehalfDescription: "আমি আমার সন্তান বা আত্মীয়ের জন্য প্রোফাইল তৈরি করছি।",
    relationLabel: "আমি কার পক্ষে প্রোফাইল তৈরি করছি",
    relationPlaceholder: "সম্পর্ক নির্বাচন করুন",
    relationRequired: "অনুগ্রহ করে নির্বাচন করুন।",
    onBehalfNidHint:
      "যাচাইয়ের জন্য আপনার NID আপলোড করতে হবে। সদস্যের NID ঐচ্ছিক।",
    saveFailed: "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
    saving: "সংরক্ষণ হচ্ছে…",
    continue: "প্রোফাইলে যান",
    relations: {
      my_son: "আমার ছেলে",
      my_daughter: "আমার মেয়ে",
      my_relative: "আত্মীয়",
      someone_else: "অন্য কারও জন্য",
    },
  },
} as const;

const profileSetup = {
  en: {
    title: "Create your profile",
    subtitle: "Complete your biodata before browsing matches or upgrading membership.",
    percentComplete: "{percent}% complete",
    stillNeeded: "Still needed",
    editPersonal: "Personal biodata",
    editFamily: "Family biodata",
    editMarital: "Marital information",
    editPartner: "Partner preferences",
    editPhotos: "Photos & verification",
    continueToApp: "Continue to EasymatchBD",
    continueHint: "Complete all required fields, then submit photos and NID for verification.",
    completePreviousStep:
      "Fill every required field on this step before opening the next one.",
    submitPhotosHint:
      "Your biodata is complete. Open Photos & verification, then submit for officer review before browsing matches.",
    loading: "Loading profile…",
  },
  bn: {
    title: "প্রোফাইল তৈরি করুন",
    subtitle: "ম্যাচ ব্রাউজ বা সদস্যতা আগে বায়োডাটা সম্পূর্ণ করুন।",
    percentComplete: "{percent}% সম্পূর্ণ",
    stillNeeded: "এখনও প্রয়োজন",
    editPersonal: "ব্যক্তিগত বায়োডাটা",
    editFamily: "পারিবারিক বায়োডাটা",
    editMarital: "বৈবাহিক তথ্য",
    editPartner: "পছন্দের তথ্য",
    editPhotos: "ছবি ও যাচাই",
    continueToApp: "EasymatchBD-তে যান",
    continueHint: "চালিয়ে যেতে প্রয়োজনীয় তথ্য পূরণ করুন, তারপর ছবি ও এনআইডি যাচাইয়ের জন্য জমা দিন।",
    completePreviousStep:
      "পরবর্তী ধাপ খোলার আগে এই ধাপের সব বাধ্যতামূলক তথ্য পূরণ করুন।",
    submitPhotosHint:
      "আপনার বায়োডাটা সম্পূর্ণ। ছবি ও যাচাই খুলে অফিসার পর্যালোচনার জন্য জমা দিন, তারপর ম্যাচ দেখুন।",
    loading: "প্রোফাইল লোড হচ্ছে…",
  },
} as const;

const pinSetup = {
  en: {
    title: "Protect this device",
    subtitle:
      "Set a 4-digit PIN so you can reopen the app without waiting for a new OTP. You stay signed in on this phone.",
    pinLabel: "PIN",
    confirmPin: "Confirm PIN",
    save: "Save and continue",
    skip: "Not now",
    saving: "Saving…",
    biometricHint: "You can also unlock with fingerprint or face on this phone.",
    mismatch: "The two PINs do not match.",
    errorLength: "PIN must be 4 digits.",
    errorDigits: "PIN must contain digits only.",
    errorWeak: "Avoid repeated or sequential digits like 1111 or 1234.",
    saveFailed: "Could not save the PIN. Please try again.",
  },
  bn: {
    title: "এই ডিভাইস সুরক্ষিত করুন",
    subtitle:
      "৪ সংখ্যার পিন সেট করুন, যাতে নতুন OTP ছাড়াই অ্যাপ খুলতে পারেন। এই ফোনে আপনি সাইন ইন থাকবেন।",
    pinLabel: "পিন",
    confirmPin: "পিন নিশ্চিত করুন",
    save: "সংরক্ষণ করে চালিয়ে যান",
    skip: "এখন নয়",
    saving: "সংরক্ষণ করা হচ্ছে…",
    biometricHint: "এই ফোনে আঙুলের ছাপ বা ফেস দিয়েও আনলক করতে পারবেন।",
    mismatch: "দুটি পিন মিলছে না।",
    errorLength: "পিন ৪ সংখ্যার হতে হবে।",
    errorDigits: "পিনে শুধু সংখ্যা থাকতে হবে।",
    errorWeak: "1111 বা 1234-এর মতো একই বা ধারাবাহিক সংখ্যা এড়িয়ে চলুন।",
    saveFailed: "পিন সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
  },
} as const;

export function tOnboardingTerms(locale: AppLocale) {
  return terms[locale];
}

export function tOnboardingPinSetup(locale: AppLocale) {
  return pinSetup[locale];
}

export function tOnboardingCreationIntent(locale: AppLocale) {
  return creationIntent[locale];
}

export function tOnboardingProfileSetup(locale: AppLocale) {
  return profileSetup[locale];
}
