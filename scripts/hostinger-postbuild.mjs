import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const webNextDir = path.join(webDir, ".next");
const rootNextDir = path.join(root, ".next");

if (!existsSync(webNextDir)) {
  console.error("Missing Next.js build output at", webNextDir);
  process.exit(1);
}

rmSync(rootNextDir, { recursive: true, force: true });
cpSync(webNextDir, rootNextDir, { recursive: true });

console.log("Copied apps/web/.next to root .next for Hostinger default settings");
