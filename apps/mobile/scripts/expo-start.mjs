/**
 * Start Expo with EXPO_PUBLIC_* URLs for local, live (Railway), or ngrok testing.
 * Usage: node scripts/expo-start.mjs <local|live|ngrok> [expo args...]
 * Example: node scripts/expo-start.mjs live start --go --clear
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDir, "..");

const PRESETS = {
  local: {
    EXPO_PUBLIC_API_URL: "http://10.0.2.2:4101/api/v1",
    EXPO_PUBLIC_WEB_URL: "http://10.0.2.2:4100",
  },
  live: {
    EXPO_PUBLIC_API_URL: "https://api.easymatchbd.com/api/v1",
    EXPO_PUBLIC_WEB_URL: "https://easymatchbd.com",
    EXPO_PUBLIC_VIDEO_CALL_WEB_URL: "https://easymatchbd.com",
  },
  ngrok: {
    EXPO_PUBLIC_API_URL: "https://easymatchbd.ngrok.dev/api/v1",
    EXPO_PUBLIC_WEB_URL: "https://easymatchbd.ngrok.dev",
    EXPO_PUBLIC_VIDEO_CALL_WEB_URL: "https://easymatchbd.ngrok.dev",
  },
};

function loadDotEnv(fileName) {
  const filePath = path.join(mobileRoot, fileName);
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

const profile = process.argv[2] ?? "local";
const preset = PRESETS[profile];
if (!preset) {
  console.error(
    `[easymatch] Unknown profile "${profile}". Use: local | live | ngrok`,
  );
  process.exit(1);
}

loadDotEnv(".env");
loadDotEnv(".env.local");

for (const [key, value] of Object.entries(preset)) {
  if (!process.env[key]?.trim()) {
    process.env[key] = value;
  }
}

const expoArgs = process.argv.slice(3);
if (expoArgs.length === 0) {
  expoArgs.push("start", "--go", "--clear");
}

console.log("[easymatch] Expo profile:", profile);
console.log("[easymatch] EXPO_PUBLIC_API_URL:", process.env.EXPO_PUBLIC_API_URL);
console.log("[easymatch] EXPO_PUBLIC_WEB_URL:", process.env.EXPO_PUBLIC_WEB_URL);

const child = spawn("npx", ["expo", ...expoArgs], {
  cwd: mobileRoot,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
