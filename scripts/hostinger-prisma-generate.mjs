import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "apps/api");

const buildEnv = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://build:build@127.0.0.1:5432/build?schema=public",
  DIRECT_URL:
    process.env.DIRECT_URL ||
    "postgresql://build:build@127.0.0.1:5432/build?schema=public",
};

execSync("npx prisma generate", {
  cwd: apiDir,
  stdio: "inherit",
  env: buildEnv,
});
