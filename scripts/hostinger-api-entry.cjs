module.exports = function apiEntrySource() {
  return `"use strict";

process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

const path = require("node:path");
const fs = require("node:fs");

function findApiMainFile() {
  const roots = [
    path.join(__dirname, "hostinger-api-deploy"),
    path.join(__dirname, "api-runtime"),
    __dirname,
  ];

  for (const root of roots) {
    const mainFile = path.join(root, "dist/src/main.js");
    if (fs.existsSync(mainFile)) {
      return { root, mainFile };
    }
  }

  return null;
}

const located = findApiMainFile();
if (!located) {
  console.error("[easymatch-api] Cannot find dist/src/main.js from", __dirname);
  process.exit(1);
}

process.chdir(located.root);
console.log(
  "[easymatch-api] Starting on port",
  process.env.PORT || 3000,
  "file:",
  located.mainFile,
);
require(located.mainFile);
`;
};
