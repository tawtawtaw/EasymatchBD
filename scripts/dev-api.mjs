/**
 * Start API on EASYMATCH_API_PORT (4101) — same as `npm run dev` api leg.
 * Forces NODE_ENV=development so PORT from .env (e.g. Railway 4999) is not used locally.
 */
import { spawn } from "node:child_process";

const env = {
  ...process.env,
  NODE_ENV: "development",
};

const cmd =
  'npx kill-port 4101 && npm run start:dev -w @easymatch/api';

const child = spawn(cmd, { stdio: "inherit", shell: true, env });

child.on("exit", (code) => process.exit(code ?? 0));
