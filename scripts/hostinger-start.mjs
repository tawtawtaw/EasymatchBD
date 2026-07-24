import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = process.env.PORT?.trim() || "4100";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverFile = path.join(
  root,
  "apps/web/.next/standalone/apps/web/server.js",
);

if (!existsSync(serverFile)) {
  console.error("Standalone server not found:", serverFile);
  console.error("Run npm run build:hostinger-web first.");
  process.exit(1);
}

process.env.HOSTNAME = "0.0.0.0";
process.env.PORT = port;

const child = spawn(process.execPath, [serverFile], {
  cwd: path.dirname(serverFile),
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
