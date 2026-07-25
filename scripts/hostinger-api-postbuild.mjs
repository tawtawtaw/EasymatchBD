import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "apps/api");
const apiDist = path.join(apiDir, "dist");
const deployDir = path.join(root, "hostinger-api-deploy");
const sharedDir = path.join(root, "packages/shared");
const mainFile = path.join(apiDist, "src/main.js");

if (!existsSync(mainFile)) {
  console.error("Missing API build at", mainFile);
  process.exit(1);
}

rmSync(deployDir, { recursive: true, force: true });
mkdirSync(deployDir, { recursive: true });
mkdirSync(path.join(deployDir, "uploads"), { recursive: true });
mkdirSync(path.join(deployDir, "packages/shared"), { recursive: true });

cpSync(apiDist, path.join(deployDir, "dist"), { recursive: true });
cpSync(path.join(apiDir, "prisma"), path.join(deployDir, "prisma"), { recursive: true });
cpSync(path.join(sharedDir, "dist"), path.join(deployDir, "packages/shared/dist"), {
  recursive: true,
});
cpSync(path.join(sharedDir, "package.json"), path.join(deployDir, "packages/shared/package.json"));

const apiPkg = JSON.parse(readFileSync(path.join(apiDir, "package.json"), "utf8"));
const prismaVersion = (apiPkg.devDependencies?.prisma ?? "6.19.0").replace(/^[\^~]/, "");

writeFileSync(
  path.join(deployDir, "package.json"),
  JSON.stringify(
    {
      name: "easymatch-api-hostinger",
      private: true,
      main: "server.js",
      engines: { node: "20.x" },
      scripts: { start: "node server.js" },
      dependencies: {
        ...apiPkg.dependencies,
        "@easymatch/shared": "file:./packages/shared",
        prisma: prismaVersion,
      },
    },
    null,
    2,
  ),
);

writeFileSync(
  path.join(deployDir, "server.js"),
  `process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
const path = require("node:path");
process.chdir(__dirname);
console.log("[easymatch-api] Starting on port", process.env.PORT || "3000");
require("./dist/src/main.js");
`,
);

if (process.platform === "linux") {
  console.log("Installing API runtime dependencies in hostinger-api-deploy...");
  const buildEnv = {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://build:build@127.0.0.1:5432/build?schema=public",
    DIRECT_URL:
      process.env.DIRECT_URL ||
      "postgresql://build:build@127.0.0.1:5432/build?schema=public",
  };
  execSync("npm install --omit=dev --no-audit --no-fund", {
    cwd: deployDir,
    stdio: "inherit",
  });
  execSync("npx prisma generate", { cwd: deployDir, stdio: "inherit", env: buildEnv });
} else {
  console.log("Skipping npm install (Hostinger Linux build will install deps)");
}

console.log("");
console.log("=== Hostinger API bundle ready: hostinger-api-deploy/ ===");
console.log("Create a second Node.js site with:");
console.log("  Framework preset:  Other");
console.log("  Build command:     npm run build:hostinger-api");
console.log("  Output directory:  hostinger-api-deploy");
console.log("  Entry file:        server.js");
console.log("  Domain:            api.easymatchbd.com");
console.log("");
