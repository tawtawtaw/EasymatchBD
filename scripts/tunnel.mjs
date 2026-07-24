import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DOMAIN = "easymatchbd.ngrok.dev";
const NGROK_PORTS = [4040, 4041, 4042, 4043, 4044, 4045];

async function fetchTunnels(port) {
  const res = await fetch(`http://127.0.0.1:${port}/api/tunnels`, {
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) return null;
  return res.json();
}

async function findEasymatchTunnel() {
  for (const port of NGROK_PORTS) {
    try {
      const data = await fetchTunnels(port);
      if (!data?.tunnels) continue;
      for (const tunnel of data.tunnels) {
        if (tunnel.public_url?.includes(DOMAIN)) {
          return { port, tunnel };
        }
      }
    } catch {
      // ngrok agent not listening on this port
    }
  }
  return null;
}

async function status() {
  const match = await findEasymatchTunnel();
  if (!match) {
    console.log(`No active tunnel for https://${DOMAIN}`);
    process.exit(1);
  }
  console.log(`Tunnel already running: ${match.tunnel.public_url}`);
  console.log(`Dashboard: http://127.0.0.1:${match.port}`);
  process.exit(0);
}

async function stop() {
  const match = await findEasymatchTunnel();
  if (!match) {
    console.log(`No active tunnel for https://${DOMAIN}`);
    process.exit(0);
  }

  const name = match.tunnel.name;
  const res = await fetch(
    `http://127.0.0.1:${match.port}/api/tunnels/${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    console.error(`Failed to stop tunnel "${name}" on port ${match.port}`);
    process.exit(1);
  }

  console.log(`Stopped ${match.tunnel.public_url}`);
}

async function start() {
  const match = await findEasymatchTunnel();
  if (match) {
    console.log(`Tunnel already running: ${match.tunnel.public_url}`);
    console.log("Share: https://easymatchbd.ngrok.dev/en");
    console.log("To restart: npm run tunnel:stop && npm run tunnel");
    return;
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    console.error("LOCALAPPDATA is not set; cannot find global ngrok config.");
    process.exit(1);
  }

  const globalConfig = `${localAppData}\\ngrok\\ngrok.yml`;
  const projectConfig = join(dirname(fileURLToPath(import.meta.url)), "..", "ngrok.yml");

  const child = spawn(
    "ngrok",
    ["start", "web", "--config", `${globalConfig},${projectConfig}`],
    { stdio: "inherit", shell: true },
  );

  child.on("exit", (code) => process.exit(code ?? 0));
}

const action = process.argv[2] ?? "status";

switch (action) {
  case "status":
    await status();
    break;
  case "stop":
    await stop();
    break;
  case "start":
    await start();
    break;
  default:
    console.error(`Unknown action: ${action}`);
    process.exit(1);
}
