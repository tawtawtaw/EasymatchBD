/**
 * Railway API start: apply Prisma migrations, then boot the server.
 * Migration failure must not block start — runtime schema ensure in PrismaService
 * can still add Connection.endedAt if migrate could not use DIRECT_URL.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command) {
  console.log(`> ${command}`);
  execSync(command, { cwd: root, stdio: "inherit", env: process.env });
}

try {
  run("npm run prisma:migrate:deploy -w @easymatch/api");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `[railway-api-start] prisma migrate deploy failed (${message}). Continuing so runtime schema ensure can repair Connection.endedAt.`,
  );
}

run("npm run start:prod -w @easymatch/api");
