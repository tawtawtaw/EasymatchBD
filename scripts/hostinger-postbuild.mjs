import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const webNextDir = path.join(webDir, ".next");
const rootNextDir = path.join(root, ".next");
const standaloneDir = path.join(webNextDir, "standalone");
const standaloneWebDir = path.join(standaloneDir, "apps/web");

if (!existsSync(webNextDir)) {
  console.error("Missing Next.js build output at", webNextDir);
  process.exit(1);
}

if (existsSync(standaloneWebDir)) {
  mkdirSync(path.join(standaloneWebDir, ".next/static"), { recursive: true });
  cpSync(path.join(webNextDir, "static"), path.join(standaloneWebDir, ".next/static"), {
    recursive: true,
  });
  cpSync(path.join(webDir, "public"), path.join(standaloneWebDir, "public"), {
    recursive: true,
  });
}

rmSync(rootNextDir, { recursive: true, force: true });
cpSync(webNextDir, rootNextDir, { recursive: true });

cpSync(path.join(root, "app.js"), path.join(rootNextDir, "app.js"));

writeFileSync(
  path.join(rootNextDir, "package.json"),
  JSON.stringify(
    {
      name: "easymatch-web-runtime",
      private: true,
      main: "app.js",
      scripts: { start: "node app.js" },
      engines: { node: "20.x" },
    },
    null,
    2,
  ),
);

console.log("Prepared .next for Hostinger (includes standalone runtime + app.js launcher)");
