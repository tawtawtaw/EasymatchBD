import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "messages");

for (const file of ["en.json", "bn.json"]) {
  const full = path.join(dir, file);
  const raw = fs.readFileSync(full, "utf8");
  try {
    JSON.parse(raw);
    console.log(`${file}: valid (${raw.length} chars)`);
  } catch (err) {
    console.error(`${file}: INVALID at ${err.message}`);
    const pos = Number(String(err.message).match(/position (\d+)/)?.[1]);
    if (Number.isFinite(pos)) {
      console.error("Context:", JSON.stringify(raw.slice(Math.max(0, pos - 40), pos + 40)));
    }
    process.exitCode = 1;
  }
}
