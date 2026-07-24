import type { AppLocale } from "../lib/locale";

const whatsappSupport = {
  en: {
    buttonLabel: "WhatsApp support",
    open: "Open WhatsApp support",
    close: "Close",
    panelTitle: "EasymatchBD Support",
    panelSubtitle: "Chat with our team on WhatsApp. Choose a topic to start with a helpful message.",
    quickTopics: "How can we help?",
    chatNow: "Chat on WhatsApp",
    opensWhatsApp: "Opens WhatsApp on your phone",
    openError: "Could not open WhatsApp. Install WhatsApp or try again.",
    topics: {
      account: {
        label: "Account & sign in",
        message: "Hello EasymatchBD support, I need help with my account or sign in on the mobile app.",
      },
      browse: {
        label: "Browse biodata",
        message: "Hello EasymatchBD support, I have a question about browsing biodata in the mobile app.",
      },
      verification: {
        label: "Profile verification",
        message: "Hello EasymatchBD support, I need help with profile verification on the mobile app.",
      },
      privacy: {
        label: "Privacy & photos",
        message: "Hello EasymatchBD support, I have a question about privacy levels and photos.",
      },
      membership: {
        label: "Paid membership",
        message: "Hello EasymatchBD support, I need help with paid membership or payment in the mobile app.",
      },
      general: {
        label: "Other question",
        message: "Hello EasymatchBD support, I would like to speak with someone.",
      },
    },
  },
  bn: {
    buttonLabel: "WhatsApp সাপোর্ট",
    open: "WhatsApp সাপোর্ট খুলুন",
    close: "বন্ধ",
    panelTitle: "EasymatchBD সাপোর্ট",
    panelSubtitle: "WhatsApp-এ আমাদের টিমের সাথে চ্যাট করুন। একটি বিষয় বেছে নিলে সহায়ক বার্তা দিয়ে শুরু হবে।",
    quickTopics: "আমরা কীভাবে সাহায্য করতে পারি?",
    chatNow: "WhatsApp-এ চ্যাট",
    opensWhatsApp: "আপনার ফোনে WhatsApp খুলবে",
    openError: "WhatsApp খোলা যায়নি। WhatsApp ইনস্টল আছে কিনা দেখুন।",
    topics: {
      account: {
        label: "অ্যাকাউন্ট ও সাইন ইন",
        message: "হ্যালো EasymatchBD সাপোর্ট, মোবাইল অ্যাপে আমার অ্যাকাউন্ট বা সাইন ইন নিয়ে সাহায্য দরকার।",
      },
      browse: {
        label: "বায়োডাটা ব্রাউজ",
        message: "হ্যালো EasymatchBD সাপোর্ট, মোবাইল অ্যাপে বায়োডাটা ব্রাউজ নিয়ে আমার প্রশ্ন আছে।",
      },
      verification: {
        label: "প্রোফাইল যাচাইকরণ",
        message: "হ্যালো EasymatchBD সাপোর্ট, মোবাইল অ্যাপে প্রোফাইল যাচাইকরণে সাহায্য দরকার।",
      },
      privacy: {
        label: "গোপনীয়তা ও ছবি",
        message: "হ্যালো EasymatchBD সাপোর্ট, গোপনীয়তা স্তর ও ছবি নিয়ে আমার প্রশ্ন আছে।",
      },
      membership: {
        label: "পেইড সদস্যতা",
        message: "হ্যালো EasymatchBD সাপোর্ট, মোবাইল অ্যাপে পেইড সদস্যতা বা পেমেন্ট নিয়ে সাহায্য দরকার।",
      },
      general: {
        label: "অন্যান্য প্রশ্ন",
        message: "হ্যালো EasymatchBD সাপোর্ট, আমি আপনাদের দলের সাথে যোগাযোগ করতে চাই।",
      },
    },
  },
} as const;

export function tWhatsappSupport(locale: AppLocale) {
  return whatsappSupport[locale];
}
