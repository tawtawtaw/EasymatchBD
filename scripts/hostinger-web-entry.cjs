module.exports = function webEntrySource() {
  return `"use strict";

process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

const path = require("node:path");
const fs = require("node:fs");

function findWebServerFile() {
  const roots = [__dirname, path.join(__dirname, "hostinger-deploy")];
  for (const root of roots) {
    const serverFile = path.join(root, "apps/web/server.js");
    if (fs.existsSync(serverFile)) {
      return serverFile;
    }
  }
  return null;
}

const serverFile = findWebServerFile();
if (!serverFile) {
  console.error("[easymatch-web] Cannot find apps/web/server.js from", __dirname);
  process.exit(1);
}

console.log(
  "[easymatch-web] Starting on port",
  process.env.PORT || 3000,
  "file:",
  serverFile,
);
process.chdir(path.dirname(serverFile));
require(serverFile);
`;
};
