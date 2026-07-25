const fs = require("node:fs");
const path = require("node:path");

process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

const root = __dirname;
console.log("[easymatch] Entry server.js cwd:", root);

function fileExists(candidate) {
  return fs.existsSync(candidate);
}

function findWebServerFile() {
  const searchRoots = [root, path.join(root, "hostinger-deploy")];

  for (const base of searchRoots) {
    const serverFile = path.join(base, "apps/web/server.js");
    if (fileExists(serverFile)) {
      return serverFile;
    }
  }

  return null;
}

function findWebBundleEntry() {
  const bundleEntry = path.join(root, "hostinger-deploy/server.js");
  if (
    fileExists(bundleEntry) &&
    fileExists(path.join(root, "hostinger-deploy/apps/web/server.js"))
  ) {
    return bundleEntry;
  }

  return null;
}

function detectRuntime() {
  const forced = process.env.EASYMATCH_RUNTIME?.trim().toLowerCase();
  if (forced === "web" || forced === "api") {
    return forced;
  }

  const hasWeb = findWebServerFile() !== null;
  const hasApi = [
    path.join(root, "hostinger-api-deploy/dist/src/main.js"),
    path.join(root, "api-runtime/dist/src/main.js"),
  ].some(fileExists);

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
  const bundleEntry = findWebBundleEntry();
  if (bundleEntry) {
    console.log("[easymatch-web] Starting via bundle entry:", bundleEntry);
    require(bundleEntry);
    return true;
  }

  const serverFile = findWebServerFile();
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
    for (const candidate of [
      path.join(root, "hostinger-deploy/apps/web/server.js"),
      path.join(root, "apps/web/server.js"),
    ]) {
      console.error(" - missing", candidate);
    }
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
