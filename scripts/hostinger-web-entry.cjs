module.exports = function webEntrySource() {
  return `"use strict";

if (global.__EASYMATCH_WEB_ENTRY_STARTED) {
  console.log("[easymatch-web] Duplicate entry skipped");
  return;
}
global.__EASYMATCH_WEB_ENTRY_STARTED = true;

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";

function findWebServerFile() {
  const roots = [__dirname, path.join(__dirname, "hostinger-deploy")];
  for (const root of roots) {
    const serverFile = path.join(root, "apps/web/server.js");
    if (fs.existsSync(serverFile)) {
      return { root, serverFile };
    }
  }
  return null;
}

function acquireSingletonLock(lockFile) {
  if (fs.existsSync(lockFile)) {
    try {
      const oldPid = Number.parseInt(fs.readFileSync(lockFile, "utf8"), 10);
      if (Number.isFinite(oldPid) && oldPid > 0 && oldPid !== process.pid) {
        try {
          process.kill(oldPid, 0);
          return false;
        } catch {
          fs.unlinkSync(lockFile);
        }
      }
    } catch {
      try {
        fs.unlinkSync(lockFile);
      } catch {}
    }
  }

  try {
    fs.writeFileSync(lockFile, String(process.pid), { flag: "wx" });
    const release = () => {
      try {
        fs.unlinkSync(lockFile);
      } catch {}
    };
    process.on("exit", release);
    process.on("SIGTERM", release);
    process.on("SIGINT", release);
    return true;
  } catch {
    return false;
  }
}

function patchListenOnce() {
  if (global.__EASYMATCH_LISTEN_PATCHED) {
    return;
  }
  global.__EASYMATCH_LISTEN_PATCHED = true;

  const originalListen = http.Server.prototype.listen;
  let hasListened = false;

  http.Server.prototype.listen = function patchedListen(...args) {
    if (hasListened) {
      console.log("[easymatch-web] Ignoring duplicate listen()");
      return this;
    }
    hasListened = true;
    return originalListen.apply(this, args);
  };
}

const located = findWebServerFile();
if (!located) {
  console.error("[easymatch-web] Cannot find apps/web/server.js from", __dirname);
  process.exit(1);
}

const lockFile = path.join(located.root, ".easymatch-web.lock");
if (!acquireSingletonLock(lockFile)) {
  console.log("[easymatch-web] Primary worker already running, exiting secondary worker");
  process.exit(0);
}

patchListenOnce();

console.log(
  "[easymatch-web] Starting on port",
  process.env.PORT || 3000,
  "host:",
  process.env.HOSTNAME,
  "pid:",
  process.pid,
  "file:",
  located.serverFile,
);

process.chdir(path.dirname(located.serverFile));
require(located.serverFile);
`;
};
