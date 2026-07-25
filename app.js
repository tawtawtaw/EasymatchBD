const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const port = process.env.PORT || "4100";
const root = __dirname;

process.env.HOSTNAME = "0.0.0.0";
process.env.PORT = String(port);

function onChildExit(child) {
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

function startStandalone(serverFile) {
  console.log("[easymatch] Starting standalone server:", serverFile);
  const child = spawn(process.execPath, [serverFile], {
    cwd: path.dirname(serverFile),
    stdio: "inherit",
    env: process.env,
  });
  onChildExit(child);
}

function startNextWorkspace() {
  console.log("[easymatch] Starting next start (@easymatch/web) on port", port);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npm, ["run", "start", "-w", "@easymatch/web", "--", "-p", port], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  onChildExit(child);
}

const standaloneCandidates = [
  path.join(root, "standalone/apps/web/server.js"),
  path.join(root, ".next/standalone/apps/web/server.js"),
  path.join(root, "apps/web/.next/standalone/apps/web/server.js"),
];

const standaloneServer = standaloneCandidates.find((candidate) => existsSync(candidate));

if (standaloneServer) {
  startStandalone(standaloneServer);
} else if (
  existsSync(path.join(root, "apps/web/package.json")) &&
  existsSync(path.join(root, "apps/web/.next"))
) {
  startNextWorkspace();
} else {
  console.error("[easymatch] No server entry found. Checked:");
  for (const candidate of standaloneCandidates) {
    console.error(" -", candidate);
  }
  process.exit(1);
}
