import { describe, expect, it } from "vitest";
import { buildRunnerApp } from "../src/server.js";
import type { AutomationPublishRequest, AutomationPublishReceipt } from "../src/types.js";

describe("runner HTTP API", () => {
  it("reports runner health", async () => {
    const app = await buildRunnerApp({
      publisher: async () => ({ ok: true, status: "published", message: "unused" }),
    });

    const res = await app.inject({ method: "GET", url: "/health" });
    const json = res.json() as { ok: boolean; runner: string; browser: { installed: boolean }; profilesDir: string };

    expect(res.statusCode).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.runner).toBe("playwright");
    expect(json.browser.installed).toBeTypeOf("boolean");
    expect(json.profilesDir).toContain("playwright-profiles");
  });

  it("rejects invalid publish requests", async () => {
    const app = await buildRunnerApp({
      publisher: async () => ({ ok: true, status: "published", message: "unused" }),
    });

    const res = await app.inject({
      method: "POST",
      url: "/automation/publish",
      payload: { platformId: "douyin", mode: "full-auto", payload: {} },
    });
    const json = res.json() as { ok: boolean; error: string };

    expect(res.statusCode).toBe(400);
    expect(json).toEqual({ ok: false, error: "unsupported platformId" });
  });

  it("delegates valid publish requests to the injected publisher", async () => {
    const calls: AutomationPublishRequest[] = [];
    const app = await buildRunnerApp({
      publisher: async (req): Promise<AutomationPublishReceipt> => {
        calls.push(req);
        return { ok: true, status: "published", message: `published ${req.platformId}`, remoteUrl: "https://example.test/p/1" };
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/automation/publish",
      payload: {
        platformId: "zhihu",
        mode: "full-auto",
        payload: { title: "A", content: "<p>B</p>", mime: "text/html" },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      ok: true,
      status: "published",
      message: "published zhihu",
      remoteUrl: "https://example.test/p/1",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.platformId).toBe("zhihu");
  });

  it("session open returns a user-action receipt before real browser sessions exist", async () => {
    const app = await buildRunnerApp({
      publisher: async () => ({ ok: true, status: "published", message: "unused" }),
    });

    const res = await app.inject({ method: "POST", url: "/automation/session/open", payload: { platformId: "zhihu" } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      ok: false,
      status: "needs-user-action",
    });
  });
});
