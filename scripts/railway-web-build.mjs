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
run("npm run build -w @easymatch/web");
