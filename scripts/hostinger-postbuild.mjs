import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const standaloneDir = path.join(webDir, ".next/standalone");
const standaloneWebDir = path.join(standaloneDir, "apps/web");
const standalonePackageJson = path.join(standaloneWebDir, "package.json");

if (!existsSync(standaloneDir)) {
  console.error("Missing standalone build output at", standaloneDir);
  process.exit(1);
}

const staticTarget = path.join(standaloneWebDir, ".next/static");
const publicTarget = path.join(standaloneWebDir, "public");

mkdirSync(path.dirname(staticTarget), { recursive: true });
cpSync(path.join(webDir, ".next/static"), staticTarget, { recursive: true });
cpSync(path.join(webDir, "public"), publicTarget, { recursive: true });

if (existsSync(standalonePackageJson)) {
  const pkg = JSON.parse(readFileSync(standalonePackageJson, "utf8"));
  pkg.main = "server.js";
  pkg.scripts = {
    ...pkg.scripts,
    start: "node server.js",
  };
  writeFileSync(standalonePackageJson, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log("Patched standalone package.json start script -> node server.js");
}

console.log("Copied static assets into standalone output");
