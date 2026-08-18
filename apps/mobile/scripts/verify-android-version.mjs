import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appJsonPath = path.join(root, "app.json");
const gradlePath = path.join(root, "android", "app", "build.gradle");

function fail(message) {
  console.error(`\n[easymatch] ${message}\n`);
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
const jsonCode = appJson?.expo?.android?.versionCode;
if (!Number.isInteger(jsonCode) || jsonCode < 1) {
  fail(`app.json android.versionCode must be a positive integer. Found: ${JSON.stringify(jsonCode)}`);
}

const gradle = fs.readFileSync(gradlePath, "utf8");
const gradleMatch = gradle.match(/^\s*versionCode\s+(.+)$/m);
if (!gradleMatch) {
  fail("android/app/build.gradle is missing a versionCode line.");
}

const gradleRaw = gradleMatch[1].trim();
if (!/^\d+$/.test(gradleRaw)) {
  fail(
    `android/app/build.gradle versionCode must be a bare integer with no comma or quotes.\n` +
      `  Found: versionCode ${gradleRaw}\n` +
      `  A trailing comma (versionCode 21,) makes Gradle fail with "Value is null".`,
  );
}

const gradleCode = Number(gradleRaw);
if (gradleCode !== jsonCode) {
  fail(
    `versionCode mismatch: app.json has ${jsonCode}, android/app/build.gradle has ${gradleCode}.`,
  );
}

console.log(`[easymatch] Android versionCode ${jsonCode} OK`);
