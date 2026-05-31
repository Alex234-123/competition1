import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AutomationPlatformId } from "../types.js";

export interface RunArtifacts {
  readonly dir: string;
  readonly requestPath: string;
  readonly receiptPath: string;
  readonly finalScreenshotPath: string;
  readonly failureScreenshotPath: string;
  readonly tracePath: string;
  readonly domPath: string;
  writeJson(kind: "request" | "receipt", value: unknown): Promise<void>;
}

const secretKeyPattern = /(secret|token|password|cookie|apikey|api_key|appsecret|accessToken)/i;

export async function createRunArtifacts(
  root: string,
  platformId: AutomationPlatformId,
  now: Date = new Date(),
): Promise<RunArtifacts> {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const dir = join(root, `${stamp}-${platformId}`);
  await mkdir(dir, { recursive: true });

  const requestPath = join(dir, "request.json");
  const receiptPath = join(dir, "receipt.json");
  return {
    dir,
    requestPath,
    receiptPath,
    finalScreenshotPath: join(dir, "final.png"),
    failureScreenshotPath: join(dir, "failure.png"),
    tracePath: join(dir, "trace.zip"),
    domPath: join(dir, "dom.html"),
    async writeJson(kind, value) {
      const path = kind === "request" ? requestPath : receiptPath;
      await writeFile(path, `${JSON.stringify(redactForArtifact(value), null, 2)}\n`, "utf8");
    },
  };
}

export function redactForArtifact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactForArtifact(item));
  if (!isRecord(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = secretKeyPattern.test(key) ? "[redacted]" : redactForArtifact(entry);
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
