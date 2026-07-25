import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = process.env.PORT?.trim() || "4100";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const standaloneServer = path.join(
  webDir,
  ".next/standalone/apps/web/server.js",
);

process.env.HOSTNAME = "0.0.0.0";
process.env.PORT = port;

function startStandalone() {
  console.log("[hostinger] Starting Next.js standalone server on port", port);
  return spawn(process.execPath, [standaloneServer], {
    cwd: path.dirname(standaloneServer),
    stdio: "inherit",
    env: process.env,
  });
}

function startNextCli() {
  console.log("[hostinger] Standalone missing; falling back to next start on port", port);
  const require = createRequire(path.join(webDir, "package.json"));
  const nextBin = require.resolve("next/dist/bin/next");
  return spawn(
    process.execPath,
    [nextBin, "start", "-H", "0.0.0.0", "-p", port],
    {
      cwd: webDir,
      stdio: "inherit",
      env: process.env,
    },
  );
}

const child = existsSync(standaloneServer)
  ? startStandalone()
  : startNextCli();

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
