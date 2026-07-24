import { execSync } from "node:child_process";

/** Hostinger builds on Linux; npm ci from a Windows lockfile can skip Tailwind native bindings. */
if (process.platform !== "linux") {
  process.exit(0);
}

execSync(
  "npm install @tailwindcss/oxide-linux-x64-gnu@4.3.0 -w @easymatch/web --no-audit --no-fund",
  { stdio: "inherit" },
);
