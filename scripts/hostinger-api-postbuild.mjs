import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "apps/api");
const apiDist = path.join(apiDir, "dist");
const deployDir = path.join(root, "hostinger-api-deploy");
const sharedDir = path.join(root, "packages/shared");
const deployModules = path.join(deployDir, "node_modules");
const mainFile = path.join(apiDist, "src/main.js");

const moduleRoots = [
  path.join(root, "node_modules"),
  path.join(apiDir, "node_modules"),
  path.join(sharedDir, "node_modules"),
];

function resolveModulePath(packageName) {
  for (const base of moduleRoots) {
    const candidate = path.join(base, packageName);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function copyPackageTree(packageName, visited = new Set()) {
  if (visited.has(packageName)) {
    return;
  }
  visited.add(packageName);

  const src = resolveModulePath(packageName);
  if (!src) {
    console.warn("[hostinger-api] Missing module:", packageName);
    return;
  }

  const dest = path.join(deployModules, packageName);
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });

  const pkgJsonPath = path.join(src, "package.json");
  if (!existsSync(pkgJsonPath)) {
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.optionalDependencies };
  for (const dep of Object.keys(deps)) {
    copyPackageTree(dep, visited);
  }
}

function copyIfExists(relativePath) {
  for (const base of moduleRoots) {
    const src = path.join(base, relativePath);
    if (!existsSync(src)) {
      continue;
    }
    const dest = path.join(deployModules, relativePath);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
    return true;
  }
  return false;
}

if (!existsSync(mainFile)) {
  console.error("Missing API build at", mainFile);
  process.exit(1);
}

rmSync(deployDir, { recursive: true, force: true });
mkdirSync(deployDir, { recursive: true });
mkdirSync(path.join(deployDir, "uploads"), { recursive: true });
mkdirSync(path.join(deployDir, "packages/shared"), { recursive: true });
mkdirSync(deployModules, { recursive: true });

cpSync(apiDist, path.join(deployDir, "dist"), { recursive: true });
cpSync(path.join(apiDir, "prisma"), path.join(deployDir, "prisma"), { recursive: true });
cpSync(path.join(sharedDir, "dist"), path.join(deployDir, "packages/shared/dist"), {
  recursive: true,
});
cpSync(path.join(sharedDir, "package.json"), path.join(deployDir, "packages/shared/package.json"));

const apiPkg = JSON.parse(readFileSync(path.join(apiDir, "package.json"), "utf8"));

writeFileSync(
  path.join(deployDir, "package.json"),
  JSON.stringify(
    {
      name: "easymatch-api-hostinger",
      private: true,
      main: "server.js",
      engines: { node: "20.x" },
      scripts: { start: "node server.js" },
    },
    null,
    2,
  ),
);

writeFileSync(
  path.join(deployDir, "server.js"),
  `process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.chdir(__dirname);
console.log("[easymatch-api] Starting on port", process.env.PORT || "3000");
require("./dist/src/main.js");
`,
);

console.log("Copying runtime node_modules into hostinger-api-deploy...");
for (const dep of Object.keys(apiPkg.dependencies)) {
  if (dep === "@easymatch/shared") {
    continue;
  }
  copyPackageTree(dep);
}

mkdirSync(path.join(deployModules, "@easymatch"), { recursive: true });
cpSync(path.join(deployDir, "packages/shared"), path.join(deployModules, "@easymatch/shared"), {
  recursive: true,
});

if (!copyIfExists(".prisma")) {
  console.warn("[hostinger-api] Missing generated .prisma client — run prisma generate before postbuild");
}

const apiRuntimeDir = path.join(root, "api-runtime");
rmSync(apiRuntimeDir, { recursive: true, force: true });
cpSync(deployDir, apiRuntimeDir, { recursive: true });
mkdirSync(path.join(deployDir, "scripts"), { recursive: true });
cpSync(
  path.join(root, "scripts/hostinger-entry.cjs"),
  path.join(deployDir, "scripts/hostinger-entry.cjs"),
);

console.log("");
console.log("=== Hostinger API bundle ready: hostinger-api-deploy/ ===");
