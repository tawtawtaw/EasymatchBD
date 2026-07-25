const fs = require("node:fs");
const path = require("node:path");

process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

const root = __dirname;

function startApi() {
  const deployRoots = [root, path.join(root, "hostinger-api-deploy")];

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

if (!startApi()) {
  require("./scripts/hostinger-entry.cjs")(root);
}
