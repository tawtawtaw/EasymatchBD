module.exports = function buildHostingerWebServer(nextConfigLiteral) {
  return `"use strict";

if (global.__EASYMATCH_WEB_SERVER_STARTED) {
  console.log("[easymatch-web] Server bootstrap already ran in pid", process.pid);
  return;
}
global.__EASYMATCH_WEB_SERVER_STARTED = true;

const fs = require("node:fs");
const path = require("node:path");

process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";

function findAppDir() {
  const candidates = [
    path.join(__dirname, "apps/web"),
    path.join(__dirname, "hostinger-deploy/apps/web"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, ".next/BUILD_ID"))) {
      return candidate;
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

const appDir = findAppDir();
if (!appDir) {
  console.error("[easymatch-web] Could not find Next app dir from", __dirname);
  process.exit(1);
}

const lockFile = path.join(path.dirname(appDir), ".easymatch-web.lock");
if (!acquireSingletonLock(lockFile)) {
  console.log("[easymatch-web] Another worker is active, exiting pid", process.pid);
  process.exit(0);
}

process.chdir(appDir);
process.env.NODE_ENV = "production";

const currentPort = Number.parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME;
const nextConfig = ${nextConfigLiteral};
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);

console.log(
  "[easymatch-web] Booting Next on",
  hostname + ":" + currentPort,
  "pid",
  process.pid,
  "dir",
  appDir,
);

require("next");
const { startServer } = require("next/dist/server/lib/start-server");

startServer({
  dir: appDir,
  isDev: false,
  config: nextConfig,
  hostname,
  port: currentPort,
  allowRetry: false,
}).catch((err) => {
  console.error("[easymatch-web] Fatal startup error:", err);
  process.exit(1);
});
`;
};
