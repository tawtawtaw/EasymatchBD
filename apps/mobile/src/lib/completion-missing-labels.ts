import type { AppLocale } from "../lib/locale";

const labels: Record<AppLocale, Record<string, string>> = {
  en: {
    gender: "Gender (Personal)",
    dateOfBirth: "Date of birth (Personal)",
    maritalStatus: "Marital status (Personal)",
    religion: "Religion (Personal)",
    prayerPractice: "Prayer practice (Personal)",
    smokingHabit: "Smoking habit (Personal)",
    currentDivision: "Current division (Personal)",
    currentDistrict: "Current district (Personal)",
    currentCityTown: "Current city/town (Personal)",
    currentAddressLine: "Current street address (Personal)",
    permanentDistrict: "Permanent district (Personal)",
    permanentCityTown: "Permanent city/town (Personal)",
    permanentAddressLine: "Permanent street address (Personal)",
    introduction: "Short introduction (Personal)",
    highestDegree: "Highest qualification (Personal)",
    educationMedium: "Education medium (Personal)",
    occupation: "Occupation (Personal)",
    fatherProfession: "Father's profession (Family)",
    motherProfession: "Mother's profession (Family)",
    ageMin: "Minimum partner age (Partner preference)",
    primaryPhoto: "Passport-size photo (Photos & verification)",
    nidFront: "NID front side (Photos & verification)",
    nidBack: "NID back side (Photos & verification)",
    creatorNidFront: "Your NID front side (Photos & verification)",
    creatorNidBack: "Your NID back side (Photos & verification)",
  },
  bn: {
    gender: "লিঙ্গ (ব্যক্তিগত)",
    dateOfBirth: "জন্ম তারিখ (ব্যক্তিগত)",
    maritalStatus: "বৈবাহিক অবস্থা (ব্যক্তিগত)",
    religion: "ধর্ম (ব্যক্তিগত)",
    prayerPractice: "নামাজের অভ্যাস (ব্যক্তিগত)",
    smokingHabit: "ধূমপানের অভ্যাস (ব্যক্তিগত)",
    currentDivision: "বর্তমান বিভাগ (ব্যক্তিগত)",
    currentDistrict: "বর্তমান জেলা (ব্যক্তিগত)",
    currentCityTown: "বর্তমান শহর/upazila (ব্যক্তিগত)",
    currentAddressLine: "বর্তমান ঠিকানা (ব্যক্তিগত)",
    permanentDistrict: "স্থায়ী জেলা (ব্যক্তিগত)",
    permanentCityTown: "স্থায়ী শহর (ব্যক্তিগত)",
    permanentAddressLine: "স্থায়ী ঠিকানা (ব্যক্তিগত)",
    introduction: "সংক্ষিপ্ত পরিচয় (ব্যক্তিগত)",
    highestDegree: "সর্বোচ্চ শিক্ষাগত যোগ্যতা (ব্যক্তিগত)",
    educationMedium: "শিক্ষার মাধ্যম (ব্যক্তিগত)",
    occupation: "পেশা (ব্যক্তিগত)",
    fatherProfession: "পিতার পেশা (পারিবারিক)",
    motherProfession: "মাতার পেশা (পারিবারিক)",
    ageMin: "সর্বনিম্ন পছন্দের বয়স (পছন্দ)",
    primaryPhoto: "পাসপোর্ট সাইজ ছবি (ছবি ও যাচাই)",
    nidFront: "এনআইডি সামনের দিক (ছবি ও যাচাই)",
    nidBack: "এনআইডি পেছনের দিক (ছবি ও যাচাই)",
    creatorNidFront: "আপনার এনআইডি সামনের দিক (ছবি ও যাচাই)",
    creatorNidBack: "আপনার এনআইডি পেছনের দিক (ছবি ও যাচাই)",
  },
};

export function getCompletionMissingLabel(locale: AppLocale, key: string): string {
  const table = labels[locale];
  if (table[key]) return table[key];
  return key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
}

export function formatCompletionMissingMessage(
  locale: AppLocale,
  keys: string[],
  intro: string,
  maxItems = 8,
): string {
  if (keys.length === 0) return intro;
  const shown = keys.slice(0, maxItems).map((key) => `• ${getCompletionMissingLabel(locale, key)}`);
  const more =
    keys.length > maxItems
      ? locale === "bn"
        ? `\n• … আরও ${keys.length - maxItems}টি`
        : `\n• … and ${keys.length - maxItems} more`
      : "";
  return `${intro}\n${shown.join("\n")}${more}`;
}
