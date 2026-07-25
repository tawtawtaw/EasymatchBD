import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const webNextDir = path.join(webDir, ".next");
const deployDir = path.join(root, ".next");
const deployNextDir = path.join(deployDir, ".next");

if (!existsSync(webNextDir)) {
  console.error("Missing Next.js build output at", webNextDir);
  process.exit(1);
}

rmSync(deployDir, { recursive: true, force: true });
mkdirSync(deployNextDir, { recursive: true });

cpSync(webNextDir, deployNextDir, { recursive: true });
cpSync(path.join(webDir, "public"), path.join(deployDir, "public"), { recursive: true });

writeFileSync(
  path.join(deployDir, "next.config.mjs"),
  "/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nexport default nextConfig;\n",
);

writeFileSync(
  path.join(deployDir, "package.json"),
  JSON.stringify(
    {
      name: "easymatch-web-runtime",
      private: true,
      engines: { node: "20.x" },
      scripts: { start: "next start -H 0.0.0.0" },
      dependencies: {
        next: "16.2.9",
        react: "19.2.4",
        "react-dom": "19.2.4",
      },
    },
    null,
    2,
  ),
);

writeFileSync(
  path.join(deployDir, "server.js"),
  `const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      await handle(req, res, parse(req.url, true));
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }).listen(port, hostname, () => {
    console.log("[easymatch] Next.js ready on " + hostname + ":" + port);
  });
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
`,
);

if (process.platform === "linux") {
  console.log("Installing runtime dependencies in .next deploy bundle...");
  execSync("npm install --omit=dev --no-audit --no-fund", {
    cwd: deployDir,
    stdio: "inherit",
  });
} else {
  console.log("Skipping npm install in .next bundle (Hostinger Linux build installs deps)");
}

console.log(
  "Prepared .next deploy bundle for Hostinger (nested .next/, server.js, runtime node_modules)",
);
