import type { AppLocale } from "../lib/locale";

const complaints = {
  en: {
    title: "Member complaints",
    subtitle:
      "Paid members can report concerns about another member using their 8-digit profile ID. A marriage consultant will review your complaint.",
    paidRequired: "Filing a complaint requires an active Gold or Platinum membership.",
    upgradeMembership: "View membership plans",
    newComplaint: "File a new complaint",
    formTitle: "Report a member",
    profileCodeLabel: "Profile ID of the member",
    profileCodePlaceholder: "12345678",
    profileCodeHint: "Enter the 8-digit profile ID shown on their biodata.",
    profileLookupLoading: "Checking profile ID…",
    profileLookupVerified: "Verified member profile found (ID {code})",
    profileLookupAnonymous: "Member",
    profileLookupNotVerified:
      "Profile {code} exists but is not verified yet. Complaints can only be filed against verified members.",
    profileLookupNotFound: "No member found with this profile ID.",
    profileLookupSelf: "You cannot file a complaint against your own profile.",
    profileLookupInvalid: "Enter a valid 8-digit profile ID (cannot start with 0).",
    categoryLabel: "Complaint category",
    descriptionLabel: "Describe your concern",
    descriptionPlaceholder:
      "Explain what happened with enough detail for the consultant to investigate…",
    submitComplaint: "Submit complaint",
    cancelForm: "Cancel",
    myComplaints: "Your complaints",
    emptyList: "You have not filed any complaints yet.",
    againstProfile: "Against profile {code}",
    loadError: "Could not load complaints.",
    submitError: "Could not submit complaint.",
    actionError: "Action failed.",
    notFound: "Complaint not found.",
    backToList: "Back to complaints",
    detailTitle: "Complaint against {code}",
    assignedConsultant: "Consultant: {name}",
    yourDescription: "Your report",
    resolutionNote: "Consultant outcome",
    cancelComplaint: "Cancel complaint",
    messagesTitle: "Messages with consultant",
    noMessages: "No messages yet. The consultant may contact you here during the review.",
    messagePlaceholder: "Add a message for the consultant…",
    sendMessage: "Send",
    sending: "Sending…",
    you: "You",
    categories: {
      misrepresentation: "Misrepresentation",
      harassment: "Harassment",
      fraud: "Fraud or scam",
      inappropriate_behavior: "Inappropriate behaviour",
      other: "Other",
    },
    status: {
      submitted: "Submitted",
      assigned: "Assigned",
      in_progress: "In review",
      resolved: "Resolved",
      dismissed: "Dismissed",
      cancelled: "Cancelled",
    },
  },
  bn: {
    title: "সদস্য অভিযোগ",
    subtitle:
      "পেইড সদস্যরা ৮-অঙ্কের প্রোফাইল আইডি দিয়ে অন্য সদস্যের বিরুদ্ধে অভিযোগ করতে পারেন। একজন বিবাহ পরামর্শদাতা আপনার অভিযোগ পর্যালোচনা করবেন।",
    paidRequired: "অভিযোগ দাখিল করতে সক্রিয় গোল্ড বা প্লাটিনাম সদস্যপদ প্রয়োজন।",
    upgradeMembership: "সদস্যপদ প্ল্যান দেখুন",
    newComplaint: "নতুন অভিযোগ দাখিল",
    formTitle: "সদস্যের বিরুদ্ধে রিপোর্ট",
    profileCodeLabel: "সদস্যের প্রোফাইল আইডি",
    profileCodePlaceholder: "12345678",
    profileCodeHint: "তাদের বায়োডাটায় দেখানো ৮-অঙ্কের প্রোফাইল আইডি লিখুন।",
    profileLookupLoading: "প্রোফাইল আইডি যাচাই হচ্ছে…",
    profileLookupVerified: "যাচাইকৃত সদস্যের প্রোফাইল পাওয়া গেছে (ID {code})",
    profileLookupAnonymous: "সদস্য",
    profileLookupNotVerified:
      "প্রোফাইল {code} আছে কিন্তু এখনো যাচাই হয়নি। শুধু যাচাইকৃত সদস্যের বিরুদ্ধে অভিযোগ করা যায়।",
    profileLookupNotFound: "এই প্রোফাইল আইডিতে কোনো সদস্য পাওয়া যায়নি।",
    profileLookupSelf: "নিজের প্রোফাইলের বিরুদ্ধে অভিযোগ করা যায় না।",
    profileLookupInvalid: "বৈধ ৮-অঙ্কের প্রোফাইল আইডি লিখুন (০ দিয়ে শুরু হতে পারে না)।",
    categoryLabel: "অভিযোগের ধরন",
    descriptionLabel: "আপনার উদ্বেগ বর্ণনা করুন",
    descriptionPlaceholder:
      "পরামর্শদাতা যাচাই করতে পারেন এমন বিস্তারিত দিয়ে কী ঘটেছে তা ব্যাখ্যা করুন…",
    submitComplaint: "অভিযোগ জমা দিন",
    cancelForm: "বাতিল",
    myComplaints: "আপনার অভিযোগ",
    emptyList: "আপনি এখনো কোনো অভিযোগ দাখিল করেননি।",
    againstProfile: "প্রোফাইল {code}-এর বিরুদ্ধে",
    loadError: "অভিযোগ লোড করা যায়নি।",
    submitError: "অভিযোগ জমা দেওয়া যায়নি।",
    actionError: "কাজটি সম্পন্ন হয়নি।",
    notFound: "অভিযোগ পাওয়া যায়নি।",
    backToList: "অভিযোগ তালিকায় ফিরুন",
    detailTitle: "প্রোফাইল {code}-এর বিরুদ্ধে অভিযোগ",
    assignedConsultant: "পরামর্শদাতা: {name}",
    yourDescription: "আপনার রিপোর্ট",
    resolutionNote: "পরামর্শদাতার সিদ্ধান্ত",
    cancelComplaint: "অভিযোগ বাতিল",
    messagesTitle: "পরামর্শদাতার সাথে বার্তা",
    noMessages: "এখনো কোনো বার্তা নেই। পর্যালোচনার সময় পরামর্শদাতা এখানে যোগাযোগ করতে পারেন।",
    messagePlaceholder: "পরামর্শদাতার জন্য বার্তা লিখুন…",
    sendMessage: "পাঠান",
    sending: "পাঠানো হচ্ছে…",
    you: "আপনি",
    categories: {
      misrepresentation: "ভুল তথ্য",
      harassment: "হয়রানি",
      fraud: "প্রতারণা",
      inappropriate_behavior: "অনুপযুক্ত আচরণ",
      other: "অন্যান্য",
    },
    status: {
      submitted: "জমা দেওয়া",
      assigned: "নিয়োগকৃত",
      in_progress: "পর্যালোচনায়",
      resolved: "সমাধান",
      dismissed: "খারিজ",
      cancelled: "বাতিল",
    },
  },
} as const;

export type ComplaintsCopy = (typeof complaints)[AppLocale];

export function tComplaints(locale: AppLocale): ComplaintsCopy {
  return complaints[locale];
}

export function fillComplaintTemplate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template,
  );
}
