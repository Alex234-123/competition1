import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { loadRunnerConfig, type RunnerConfig } from "./config.js";
import {
  isAutomationPlatformId,
  parseAutomationPublishRequest,
  type AutomationPlatformId,
  type AutomationPublishReceipt,
  type AutomationPublishRequest,
} from "./types.js";

export type AutomationPublisher = (request: AutomationPublishRequest) => Promise<AutomationPublishReceipt>;

export interface RunnerAppOptions {
  readonly config?: RunnerConfig;
  readonly publisher?: AutomationPublisher;
  readonly openSession?: (platformId: AutomationPlatformId) => Promise<AutomationPublishReceipt>;
  readonly closeSession?: (platformId?: AutomationPlatformId) => Promise<{ ok: boolean; message: string }>;
}

export async function buildRunnerApp(options: RunnerAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadRunnerConfig();
  const app = Fastify({ logger: false });
  const publisher = options.publisher ?? defaultPublisher;

  await app.register(cors, {
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/, /^chrome-extension:\/\//],
  });

  app.get("/health", async () => ({
    ok: true,
    runner: "playwright",
    browser: { installed: await isPlaywrightAvailable() },
    profilesDir: config.profilesDir,
    runsDir: config.runsDir,
  }));

  app.post("/automation/publish", async (request, reply) => {
    let parsed: AutomationPublishRequest;
    try {
      parsed = parseAutomationPublishRequest(request.body);
    } catch (err) {
      return reply.code(400).send({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    return publisher(parsed);
  });

  app.post("/automation/session/open", async (request, reply) => {
    const platformId = readOptionalPlatformId(request.body);
    if (!platformId) return reply.code(400).send({ ok: false, error: "unsupported platformId" });
    if (options.openSession) return options.openSession(platformId);
    return {
      ok: false,
      status: "needs-user-action",
      message: "Playwright browser session is not initialized yet; start the runner with browser support.",
    } satisfies AutomationPublishReceipt;
  });

  app.post("/automation/session/close", async (request, reply) => {
    const platformId = readOptionalPlatformId(request.body);
    if (request.body !== undefined && platformId === undefined) {
      return reply.code(400).send({ ok: false, error: "unsupported platformId" });
    }
    if (options.closeSession) return options.closeSession(platformId);
    return { ok: true, message: "no active browser session" };
  });

  app.setNotFoundHandler((request, reply) => {
    void reply.code(404).send({ ok: false, error: `route not found: ${request.method} ${request.url}` });
  });

  return app;
}

async function defaultPublisher(request: AutomationPublishRequest): Promise<AutomationPublishReceipt> {
  return {
    ok: false,
    status: "needs-user-action",
    message: `No automation adapter is registered for ${request.platformId} yet.`,
  };
}

async function isPlaywrightAvailable(): Promise<boolean> {
  try {
    await import("playwright");
    return true;
  } catch {
    return false;
  }
}

function readOptionalPlatformId(body: unknown): AutomationPlatformId | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body !== "object" || Array.isArray(body)) return undefined;
  const value = (body as { platformId?: unknown }).platformId;
  return isAutomationPlatformId(value) ? value : undefined;
}
