/**
 * Local dev launcher — forces NODE_ENV=development so npm installs devDependencies
 * even when the shell has NODE_ENV=production (common on Windows).
 */
import { spawn } from "node:child_process";

const env = {
  ...process.env,
  NODE_ENV: "development",
};

const cmd =
  'npx concurrently -n api,web -c green,blue "npm run start:dev -w @easymatch/api" "npx wait-on -t 120000 http-get://127.0.0.1:4101/api/v1/health && npm run dev -w @easymatch/web"';

const child = spawn(cmd, { stdio: "inherit", shell: true, env });

child.on("exit", (code) => process.exit(code ?? 0));
