if (global.__EASYMATCH_ENTRY_LOADED) {
  console.log("[easymatch] Duplicate entry load skipped");
  return;
}
global.__EASYMATCH_ENTRY_LOADED = true;

const fs = require("node:fs");
const path = require("node:path");

process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

const root = __dirname;
console.log("[easymatch] Entry server.js cwd:", root);

function fileExists(candidate) {
  return fs.existsSync(candidate);
}

function detectRuntime() {
  const forced = process.env.EASYMATCH_RUNTIME?.trim().toLowerCase();
  if (forced === "web" || forced === "api") {
    return forced;
  }

  const webCandidates = [
    path.join(root, "hostinger-deploy/apps/web/server.js"),
    path.join(root, "apps/web/server.js"),
  ];
  const apiCandidates = [
    path.join(root, "hostinger-api-deploy/dist/src/main.js"),
    path.join(root, "api-runtime/dist/src/main.js"),
  ];

  const hasWeb = webCandidates.some(fileExists);
  const hasApi = apiCandidates.some(fileExists);

  if (hasWeb && !hasApi) {
    return "web";
  }
  if (hasApi && !hasWeb) {
    return "api";
  }
  if (hasWeb && hasApi) {
    console.warn(
      "[easymatch] Both web and API bundles found. Set EASYMATCH_RUNTIME=web or api on this Hostinger site.",
    );
    return "web";
  }

  return null;
}

function startWeb() {
  const candidates = [
    path.join(root, "hostinger-deploy/apps/web/server.js"),
    path.join(root, "apps/web/server.js"),
    path.join(root, "hostinger-deploy/apps/web/.next/standalone/apps/web/server.js"),
    path.join(root, "standalone/apps/web/server.js"),
    path.join(root, "apps/web/.next/standalone/apps/web/server.js"),
    path.join(root, ".next/standalone/apps/web/server.js"),
  ];

  const serverFile = candidates.find(fileExists);
  if (!serverFile) {
    return false;
  }

  console.log("[easymatch-web] Loading standalone server in-process:", serverFile);
  process.chdir(path.dirname(serverFile));
  require(serverFile);
  return true;
}

function startApi() {
  const deployRoots = [
    path.join(root, "hostinger-api-deploy"),
    path.join(root, "api-runtime"),
  ];

  for (const deployRoot of deployRoots) {
    const mainFile = path.join(deployRoot, "dist/src/main.js");
    if (!fileExists(mainFile)) {
      continue;
    }

    process.chdir(deployRoot);
    console.log("[easymatch-api] Starting on port", process.env.PORT || "3000");
    require(mainFile);
    return true;
  }

  return false;
}

const runtime = detectRuntime();
console.log("[easymatch] Runtime mode:", runtime || "unknown");

if (runtime === "web") {
  if (!startWeb()) {
    console.error("[easymatch] Web bundle not found under", root);
    process.exit(1);
  }
} else if (runtime === "api") {
  if (!startApi()) {
    console.error("[easymatch] API bundle not found under", root);
    process.exit(1);
  }
} else if (startWeb()) {
  console.warn("[easymatch] Falling back to web startup");
} else if (startApi()) {
  console.warn("[easymatch] Falling back to API startup");
} else {
  console.error("[easymatch] No web or API entry found under", root);
  process.exit(1);
}
