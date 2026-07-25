import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = process.env.PORT?.trim() || "4100";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");

const standaloneCandidates = [
  path.join(root, ".next/standalone/apps/web/server.js"),
  path.join(webDir, ".next/standalone/apps/web/server.js"),
];

process.env.HOSTNAME = "0.0.0.0";
process.env.PORT = port;

const standaloneServer = standaloneCandidates.find((candidate) =>
  existsSync(candidate),
);

if (!standaloneServer) {
  console.error("[hostinger] Standalone server.js not found. Checked:");
  for (const candidate of standaloneCandidates) {
    console.error(" -", candidate);
  }
  process.exit(1);
}

console.log("[hostinger] Starting standalone server:", standaloneServer);
console.log("[hostinger] Listening on 0.0.0.0:" + port);

const child = spawn(process.execPath, [standaloneServer], {
  cwd: path.dirname(standaloneServer),
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
