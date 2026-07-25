import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const standaloneDir = path.join(webDir, ".next/standalone");
const standaloneWebDir = path.join(standaloneDir, "apps/web");
const deployDir = path.join(root, "hostinger-app");

if (!existsSync(standaloneWebDir)) {
  console.error("Missing standalone web output at", standaloneWebDir);
  process.exit(1);
}

rmSync(deployDir, { recursive: true, force: true });
mkdirSync(deployDir, { recursive: true });

cpSync(standaloneWebDir, deployDir, { recursive: true });

if (existsSync(path.join(standaloneDir, "node_modules"))) {
  cpSync(path.join(standaloneDir, "node_modules"), path.join(deployDir, "node_modules"), {
    recursive: true,
  });
}

cpSync(path.join(webDir, ".next/static"), path.join(deployDir, ".next/static"), {
  recursive: true,
});
cpSync(path.join(webDir, "public"), path.join(deployDir, "public"), { recursive: true });

const deployPackageJson = path.join(deployDir, "package.json");
if (existsSync(deployPackageJson)) {
  const pkg = JSON.parse(readFileSync(deployPackageJson, "utf8"));
  pkg.main = "server.js";
  pkg.scripts = {
    start: "node server.js",
  };
  writeFileSync(deployPackageJson, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log("Built Hostinger deploy bundle at hostinger-app/");
