import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const env = { ...process.env };
if (!env.NODE_OPTIONS?.includes("max-old-space-size")) {
  env.NODE_OPTIONS = [env.NODE_OPTIONS, "--max-old-space-size=4096"]
    .filter(Boolean)
    .join(" ");
}

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(
  process.execPath,
  [nextBin, "dev", "-p", "4100", "-H", "0.0.0.0"],
  { stdio: "inherit", env },
);
child.on("exit", (code) => process.exit(code ?? 0));
