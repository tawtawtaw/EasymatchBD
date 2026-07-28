import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharedDir = path.join(root, "packages", "shared");

if (!fs.existsSync(path.join(sharedDir, "package.json"))) {
  console.error(
    [
      "",
      "Railway web build: packages/shared is missing.",
      "Set the web service Root Directory to the repo root (leave it blank).",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

function run(command, cwd = root) {
  console.log(`> ${command}`);
  execSync(command, { cwd, stdio: "inherit", env: process.env });
}

run("npm run build -w @easymatch/shared");

const whatsappNumber =
  process.env.WHATSAPP_SUPPORT_NUMBER?.trim() ||
  process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER?.trim();
if (!whatsappNumber) {
  console.warn(
    [
      "",
      "Railway web build: WHATSAPP_SUPPORT_NUMBER is unset.",
      "The WhatsApp support button and contact links will not appear until you set it on the web service and redeploy.",
      "",
    ].join("\n"),
  );
}

const sharedMain = path.join(sharedDir, "dist", "index.js");
if (!fs.existsSync(sharedMain)) {
  console.error(
    [
      "",
      "Railway web build: packages/shared/dist/index.js is missing after build.",
      "Check that @easymatch/shared compiled successfully.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

run("npm run build -w @easymatch/web");
