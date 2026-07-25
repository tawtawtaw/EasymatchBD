const fs = require("node:fs");
const path = require("node:path");

process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

const root = __dirname;

function startApi() {
  const deployRoots = [
    root,
    path.join(root, "api-runtime"),
    path.join(root, "hostinger-api-deploy"),
  ];

  for (const deployRoot of deployRoots) {
    const mainFile = path.join(deployRoot, "dist/src/main.js");
    if (!fs.existsSync(mainFile)) {
      continue;
    }

    process.chdir(deployRoot);
    console.log("[easymatch-api] Starting on port", process.env.PORT || "3000");
    require(mainFile);
    return true;
  }

  return false;
}

function startWeb() {
  const candidates = [
    path.join(root, "apps/web/server.js"),
    path.join(root, "hostinger-deploy/apps/web/server.js"),
    path.join(root, "standalone/apps/web/server.js"),
    path.join(root, "apps/web/.next/standalone/apps/web/server.js"),
    path.join(root, ".next/standalone/apps/web/server.js"),
  ];

  const serverFile = candidates.find((candidate) => fs.existsSync(candidate));
  if (!serverFile) {
    return false;
  }

  console.log("[easymatch-web] Loading standalone server in-process:", serverFile);
  process.chdir(path.dirname(serverFile));
  require(serverFile);
  return true;
}

if (startApi()) {
  // API site
} else if (startWeb()) {
  // Web site
} else {
  console.error("[easymatch] No API or web entry found under", root);
  for (const dir of ["dist/src/main.js", "hostinger-api-deploy/dist/src/main.js", "api-runtime/dist/src/main.js"]) {
    console.error(" - missing", path.join(root, dir));
  }
  process.exit(1);
}
