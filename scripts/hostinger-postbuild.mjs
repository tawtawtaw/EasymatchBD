import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const webNextDir = path.join(webDir, ".next");
const standaloneDir = path.join(webNextDir, "standalone");
const standaloneWebDir = path.join(standaloneDir, "apps/web");
const deployDir = path.join(root, "hostinger-deploy");

if (!existsSync(standaloneWebDir)) {
  console.error("Missing standalone build at", standaloneWebDir);
  console.error("Ensure apps/web/next.config.ts has output: 'standalone'");
  process.exit(1);
}

mkdirSync(path.join(standaloneWebDir, ".next/static"), { recursive: true });
cpSync(path.join(webNextDir, "static"), path.join(standaloneWebDir, ".next/static"), {
  recursive: true,
});
cpSync(path.join(webDir, "public"), path.join(standaloneWebDir, "public"), {
  recursive: true,
});

rmSync(deployDir, { recursive: true, force: true });
cpSync(standaloneDir, deployDir, { recursive: true });

/** Standalone file tracing can omit internal Next files on Linux (e.g. encode-cache-tag.js). */
function syncRootPackage(packageName) {
  const src = path.join(root, "node_modules", packageName);
  const dest = path.join(deployDir, "node_modules", packageName);
  if (!existsSync(src)) {
    console.warn("[hostinger-web] Missing root package for sync:", packageName);
    return;
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log("[hostinger-web] Synced", packageName, "into deploy bundle");
}

for (const pkg of ["next", "@next/env"]) {
  syncRootPackage(pkg);
}

const requiredNextFile = path.join(
  deployDir,
  "node_modules/next/dist/server/lib/encode-cache-tag.js",
);
if (!existsSync(requiredNextFile)) {
  console.error("[hostinger-web] Missing required Next.js runtime file:", requiredNextFile);
  process.exit(1);
}

cpSync(
  path.join(root, "scripts/hostinger-entry.cjs"),
  path.join(deployDir, "hostinger-entry.cjs"),
);

writeFileSync(
  path.join(deployDir, "server.js"),
  `if (global.__EASYMATCH_WEB_BUNDLE_LOADED) {
  console.log("[easymatch-web] Duplicate bundle load skipped");
  return;
}
global.__EASYMATCH_WEB_BUNDLE_LOADED = true;

process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
const path = require("node:path");
const fs = require("node:fs");

const deployDir = __dirname;
const candidates = [
  path.join(deployDir, "apps/web/server.js"),
  path.join(deployDir, "apps/web/.next/standalone/apps/web/server.js"),
];

const serverFile = candidates.find((candidate) => fs.existsSync(candidate));
if (!serverFile) {
  console.error("[easymatch-web] Standalone server not found under", deployDir);
  process.exit(1);
}

console.log("[easymatch-web] Loading standalone server in-process:", serverFile);
process.chdir(path.dirname(serverFile));
require(serverFile);
`,
);

const standaloneServer = path.join(deployDir, "apps/web/server.js");
if (existsSync(standaloneServer)) {
  const guard = `if (global.__EASYMATCH_NEXT_STARTED) { return; }
global.__EASYMATCH_NEXT_STARTED = true;

`;
  const current = readFileSync(standaloneServer, "utf8");
  if (!current.includes("__EASYMATCH_NEXT_STARTED")) {
    writeFileSync(standaloneServer, guard + current);
  }
}

writeFileSync(
  path.join(deployDir, "package.json"),
  JSON.stringify(
    {
      name: "easymatch-hostinger",
      private: true,
      main: "server.js",
      scripts: { start: "node server.js" },
      engines: { node: "20.x" },
    },
    null,
    2,
  ),
);

console.log("");
console.log("=== Hostinger deploy bundle ready: hostinger-deploy/ ===");
console.log("Delete the current Node.js site and recreate with:");
console.log("  Framework preset:  Other  (NOT Next.js)");
console.log("  Root directory:    ./");
console.log("  Build command:     npm run build:hostinger-web");
console.log("  Output directory:  hostinger-deploy");
console.log("  Entry file:        server.js");
console.log("  Node.js version:   20.x");
console.log("");
