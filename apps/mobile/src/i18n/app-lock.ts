import type { AppLocale } from "../lib/locale";

const appLock = {
  en: {
    lockTitle: "App locked",
    lockSubtitle: "Enter your PIN to continue.",
    pinLabel: "PIN",
    unlock: "Unlock",
    useBiometric: "Use fingerprint",
    useBiometricFace: "Use Face ID",
    biometricPrompt: "Unlock EasymatchBD",
    biometricFallback: "Use PIN",
    wrongPin: "Wrong PIN. {count} attempts left.",
    lockedOut: "Too many attempts. Try again in {seconds}s.",
    signOutInstead: "Sign out instead",

    settingsTitle: "App lock",
    settingsHint:
      "Ask for a PIN before opening the app on this device. Your session stays signed in, so you never need another OTP.",
    statusOn: "On",
    statusOff: "Off",
    turnOn: "Set up PIN",
    turnOff: "Turn off app lock",
    changePin: "Change PIN",
    biometricToggleOn: "Unlock with fingerprint",
    biometricToggleOnFace: "Unlock with Face ID",
    biometricUnavailable:
      "No fingerprint or face is enrolled on this device, so PIN unlock only.",

    setupTitle: "Set a PIN",
    setupHint: "Choose {min} to {max} digits. You will need it to reopen the app.",
    setupConfirmHint: "Enter the same PIN again to confirm.",
    currentPinHint: "Enter your current PIN to continue.",
    newPin: "New PIN",
    confirmPin: "Confirm PIN",
    save: "Save PIN",
    cancel: "Cancel",
    mismatch: "The two PINs do not match.",
    errorLength: "PIN must be {min} to {max} digits.",
    errorDigits: "PIN must contain digits only.",
    errorWeak: "Avoid repeated or sequential digits like 1111 or 1234.",
    saveFailed: "Could not save the PIN. Please try again.",

    lockAppAction: "Lock app",
    lockAppHint: "Locks this device only. You stay signed in.",
    signOutTitle: "Sign out of this device",
    signOutHint:
      "Removes this device completely. Signing back in needs a new OTP sent to your phone.",
  },
  bn: {
    lockTitle: "অ্যাপ লক করা আছে",
    lockSubtitle: "চালিয়ে যেতে আপনার পিন দিন।",
    pinLabel: "পিন",
    unlock: "আনলক করুন",
    useBiometric: "আঙুলের ছাপ ব্যবহার করুন",
    useBiometricFace: "Face ID ব্যবহার করুন",
    biometricPrompt: "EasymatchBD আনলক করুন",
    biometricFallback: "পিন ব্যবহার করুন",
    wrongPin: "ভুল পিন। আর {count} বার চেষ্টা করা যাবে।",
    lockedOut: "অনেকবার ভুল হয়েছে। {seconds} সেকেন্ড পরে চেষ্টা করুন।",
    signOutInstead: "বরং সাইন আউট করুন",

    settingsTitle: "অ্যাপ লক",
    settingsHint:
      "এই ডিভাইসে অ্যাপ খোলার আগে পিন চাওয়া হবে। আপনার সেশন চালু থাকবে, তাই নতুন OTP লাগবে না।",
    statusOn: "চালু",
    statusOff: "বন্ধ",
    turnOn: "পিন সেট করুন",
    turnOff: "অ্যাপ লক বন্ধ করুন",
    changePin: "পিন পরিবর্তন করুন",
    biometricToggleOn: "আঙুলের ছাপ দিয়ে আনলক",
    biometricToggleOnFace: "Face ID দিয়ে আনলক",
    biometricUnavailable:
      "এই ডিভাইসে কোনো আঙুলের ছাপ বা ফেস যুক্ত করা নেই, তাই শুধু পিন দিয়ে আনলক হবে।",

    setupTitle: "পিন সেট করুন",
    setupHint: "{min} থেকে {max} সংখ্যার পিন বেছে নিন। অ্যাপ খুলতে এটি লাগবে।",
    setupConfirmHint: "নিশ্চিত করতে একই পিন আবার দিন।",
    currentPinHint: "চালিয়ে যেতে আপনার বর্তমান পিন দিন।",
    newPin: "নতুন পিন",
    confirmPin: "পিন নিশ্চিত করুন",
    save: "পিন সংরক্ষণ করুন",
    cancel: "বাতিল",
    mismatch: "দুটি পিন মিলছে না।",
    errorLength: "পিন {min} থেকে {max} সংখ্যার হতে হবে।",
    errorDigits: "পিনে শুধু সংখ্যা থাকতে হবে।",
    errorWeak: "1111 বা 1234-এর মতো একই বা ধারাবাহিক সংখ্যা এড়িয়ে চলুন।",
    saveFailed: "পিন সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",

    lockAppAction: "অ্যাপ লক করুন",
    lockAppHint: "শুধু এই ডিভাইস লক হবে। আপনি সাইন ইন থাকবেন।",
    signOutTitle: "এই ডিভাইস থেকে সাইন আউট",
    signOutHint:
      "এই ডিভাইস সম্পূর্ণ মুছে যাবে। আবার সাইন ইন করতে ফোনে নতুন OTP লাগবে।",
  },
} as const;

export function tAppLock(locale: AppLocale) {
  return appLock[locale];
}
