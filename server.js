const { spawn } = require("node:child_process");
const path = require("node:path");

const entry = path.join(__dirname, "scripts", "hostinger-start.mjs");
const child = spawn(process.execPath, [entry], {
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
