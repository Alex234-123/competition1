import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface RunnerConfig {
  readonly port: number;
  readonly profilesDir: string;
  readonly runsDir: string;
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");

export function loadRunnerConfig(env: NodeJS.ProcessEnv = process.env): RunnerConfig {
  return {
    port: parsePort(env["RUNNER_PORT"] ?? env["PORT"]),
    profilesDir: resolve(env["PLAYWRIGHT_PROFILE_DIR"] ?? resolve(repoRoot, "data/playwright-profiles")),
    runsDir: resolve(env["AUTOMATION_RUNS_DIR"] ?? resolve(repoRoot, "data/automation-runs")),
  };
}

function parsePort(raw: string | undefined): number {
  if (!raw) return 8790;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`invalid runner port: ${raw}`);
  }
  return port;
}
