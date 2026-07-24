import { execSync } from 'node:child_process';
import { Logger } from '@nestjs/common';
import killPort from 'kill-port';

/** Free a dev port when a stale Nest/Node process is still listening (common on Windows). */
export async function freeDevPort(port: number): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const currentPid = process.pid;

  try {
    await killPort(port, 'tcp');
    await sleep(process.platform === 'win32' ? 800 : 400);
    return true;
  } catch {
    // kill-port failed; try Windows netstat/taskkill fallback.
  }

  if (process.platform === 'win32') {
    const killed = killPortOnWindows(port, currentPid);
    if (killed) {
      await sleep(process.platform === 'win32' ? 800 : 400);
      return true;
    }
  }

  return false;
}

function killPortOnWindows(port: number, currentPid: number): boolean {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, {
      encoding: 'utf8',
    });
    const pids = new Set<number>();

    for (const line of output.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const pid = Number.parseInt(line.trim().split(/\s+/).pop() ?? '', 10);
      if (!Number.isFinite(pid) || pid <= 0 || pid === currentPid) continue;
      pids.add(pid);
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        Logger.warn(`Freed port ${port} (terminated pid ${pid})`, 'Bootstrap');
      } catch {
        // Process may already be gone.
      }
    }

    return pids.size > 0;
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
