module.exports = function buildHostingerWebServer(nextConfigLiteral) {
  return `"use strict";

if (global.__EASYMATCH_WEB_SERVER_STARTED) {
  console.log("[easymatch-web] Already bootstrapped in pid", process.pid);
  return;
}
global.__EASYMATCH_WEB_SERVER_STARTED = true;

if (process.env.NEXT_PRIVATE_WORKER) {
  console.log("[easymatch-web] Skipping Next worker subprocess on pid", process.pid);
  return;
}

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";

const originalListen = http.Server.prototype.listen;
let listenCount = 0;
http.Server.prototype.listen = function patchedListen(...args) {
  listenCount += 1;
  if (listenCount > 1) {
    console.log("[easymatch-web] Blocked duplicate listen attempt", listenCount);
    return this;
  }
  return originalListen.apply(this, args);
};

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

async function boot() {
  process.chdir(appDir);
  process.env.NODE_ENV = "production";

  const currentPort = Number.parseInt(process.env.PORT, 10) || 3000;
  const hostname = process.env.HOSTNAME;
  const nextConfig = ${nextConfigLiteral};
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);

  let handlersReady = false;
  let requestHandler = (req, res) => {
    res.statusCode = 503;
    res.setHeader("Content-Type", "text/plain");
    res.end("Easymatch web is starting");
  };
  let upgradeHandler = (req, socket) => {
    socket.destroy();
  };

  const server = http.createServer((req, res) => requestHandler(req, res));
  server.on("upgrade", (req, socket, head) => upgradeHandler(req, socket, head));

  await new Promise((resolve, reject) => {
    server.listen(currentPort, hostname, () => resolve());
    server.once("error", reject);
  });

  console.log(
    "[easymatch-web] Listening on",
    hostname + ":" + currentPort,
    "pid",
    process.pid,
  );

  require("next");
  const { getRequestHandlers } = require("next/dist/server/lib/start-server");
  const handlers = await getRequestHandlers({
    dir: appDir,
    port: currentPort,
    hostname,
    isDev: false,
    quiet: true,
  });

  requestHandler = handlers.requestHandler;
  upgradeHandler = handlers.upgradeHandler;
  handlersReady = true;

  console.log("[easymatch-web] Next handlers ready on pid", process.pid);
}

boot().catch((err) => {
  console.error("[easymatch-web] Fatal startup error:", err);
  process.exit(1);
});
`;
};
