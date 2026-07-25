const fs = require("node:fs");
const path = require("node:path");

module.exports = function startHostingerStandalone(deployDir) {
  process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

  const candidates = [
    path.join(deployDir, "apps/web/server.js"),
    path.join(deployDir, "apps/web/.next/standalone/apps/web/server.js"),
    path.join(deployDir, ".next/standalone/apps/web/server.js"),
  ];

  const serverFile = candidates.find((candidate) => fs.existsSync(candidate));

  if (!serverFile) {
    console.error("[easymatch] Standalone server not found under", deployDir);
    for (const candidate of candidates) {
      console.error(" -", candidate);
    }
    process.exit(1);
  }

  console.log("[easymatch] Loading standalone server in-process:", serverFile);
  process.chdir(path.dirname(serverFile));
  require(serverFile);
};
