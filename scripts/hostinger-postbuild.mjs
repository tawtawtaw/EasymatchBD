import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const webNextDir = path.join(webDir, ".next");
const rootNextDir = path.join(root, ".next");
const standaloneWebDir = path.join(webNextDir, "standalone/apps/web");

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

cpSync(path.join(webDir, "public"), path.join(root, "public"), { recursive: true });

writeFileSync(
  path.join(root, "next.config.mjs"),
  "/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nexport default nextConfig;\n",
);

console.log(
  "Prepared Hostinger runtime at repo root (.next/, public/, next.config.mjs)",
);
