import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const googleServicesPath = path.join(root, "google-services.json");

if (!fs.existsSync(googleServicesPath)) {
  console.error(
    "\n[easymatch] Missing apps/mobile/google-services.json\n" +
      "Download it from Firebase (package com.easymatchbd.member) before running EAS build.\n",
  );
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(googleServicesPath, "utf8"));
} catch (error) {
  console.error("[easymatch] google-services.json is not valid JSON:", error);
  process.exit(1);
}

const packageName = parsed?.client?.[0]?.client_info?.android_client_info?.package_name;
if (packageName !== "com.easymatchbd.member") {
  console.error(
    `[easymatch] google-services.json package is "${packageName ?? "unknown"}", expected com.easymatchbd.member`,
  );
  process.exit(1);
}

console.log("[easymatch] google-services.json OK for com.easymatchbd.member");

await import("./verify-android-version.mjs");
