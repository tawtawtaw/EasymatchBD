import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appJsonPath = path.join(root, "app.json");
const gradlePath = path.join(root, "android", "app", "build.gradle");

const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
const current = appJson?.expo?.android?.versionCode;
if (!Number.isInteger(current) || current < 1) {
  console.error(`[easymatch] app.json android.versionCode must be a positive integer. Found: ${JSON.stringify(current)}`);
  process.exit(1);
}

const next = current + 1;
appJson.expo.android.versionCode = next;
fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

const gradle = fs.readFileSync(gradlePath, "utf8");
if (!/^\s*versionCode\s+\S+$/m.test(gradle)) {
  console.error("[easymatch] android/app/build.gradle is missing a versionCode line.");
  process.exit(1);
}

fs.writeFileSync(
  gradlePath,
  gradle.replace(/^\s*versionCode\s+\S+$/m, `        versionCode ${next}`),
);

console.log(`[easymatch] Bumped Android versionCode ${current} -> ${next}`);
console.log("[easymatch] Do not add a comma after versionCode in build.gradle.");
