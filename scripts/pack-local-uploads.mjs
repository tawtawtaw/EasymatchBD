/**
 * Pack local profile uploads for one-time copy to Railway volume.
 *
 *   node scripts/pack-local-uploads.mjs
 *
 * Creates apps/api/uploads-railway-sync.tar.gz (uploads folder contents only).
 * Upload that archive somewhere reachable, then in Railway API shell (with volume at /data/uploads):
 *
 *   curl -L -o /tmp/uploads.tar.gz "YOUR_URL"
 *   tar -xzf /tmp/uploads.tar.gz -C /data/uploads
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadsDir = path.join(root, "apps", "api", "uploads");
const outFile = path.join(root, "apps", "api", "uploads-railway-sync.tar.gz");

if (!fs.existsSync(uploadsDir)) {
  console.error("No apps/api/uploads folder found.");
  process.exit(1);
}

const fileCount = execSync(
  process.platform === "win32"
    ? 'powershell -NoProfile -Command "(Get-ChildItem -Recurse -File uploads | Measure-Object).Count"'
    : 'find uploads -type f | wc -l',
  { cwd: path.join(root, "apps", "api"), encoding: "utf8" },
).trim();

if (fileCount === "0") {
  console.error("apps/api/uploads is empty — nothing to pack.");
  process.exit(1);
}

if (fs.existsSync(outFile)) {
  fs.unlinkSync(outFile);
}

if (process.platform === "win32") {
  execSync(
    `tar -czf "${outFile}" -C "${uploadsDir}" .`,
    { stdio: "inherit" },
  );
} else {
  execSync(`tar -czf "${outFile}" -C "${uploadsDir}" .`, {
    cwd: root,
    stdio: "inherit",
  });
}

console.log(`Packed ${fileCount} file(s) → ${outFile}`);
console.log("");
console.log("Next: Railway API service → add Volume mounted at /data/uploads");
console.log("      Set variable UPLOAD_DIR=/data/uploads");
console.log("      Upload this tar.gz, then in Railway shell:");
console.log("        curl -L -o /tmp/uploads.tar.gz \"YOUR_PUBLIC_URL\"");
console.log("        tar -xzf /tmp/uploads.tar.gz -C /data/uploads");
