import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createRunArtifacts, redactForArtifact } from "../src/diagnostics/artifacts.js";

describe("automation run artifacts", () => {
  it("creates platform-specific run directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "mpp-runs-"));
    const artifacts = await createRunArtifacts(root, "zhihu", new Date("2026-05-31T10:20:30.000Z"));

    expect(artifacts.dir).toContain("2026-05-31T10-20-30-000Z-zhihu");
    expect(artifacts.requestPath).toBe(join(artifacts.dir, "request.json"));
    expect(artifacts.receiptPath).toBe(join(artifacts.dir, "receipt.json"));
    expect(artifacts.finalScreenshotPath).toBe(join(artifacts.dir, "final.png"));
    expect(artifacts.failureScreenshotPath).toBe(join(artifacts.dir, "failure.png"));
    expect(artifacts.tracePath).toBe(join(artifacts.dir, "trace.zip"));
    expect(artifacts.domPath).toBe(join(artifacts.dir, "dom.html"));
  });

  it("writes redacted request JSON", async () => {
    const root = await mkdtemp(join(tmpdir(), "mpp-runs-"));
    const artifacts = await createRunArtifacts(root, "zhihu", new Date("2026-05-31T10:20:30.000Z"));

    await artifacts.writeJson("request", {
      platformId: "zhihu",
      token: "SECRET_TOKEN",
      nested: { password: "SECRET_PASSWORD", title: "Visible" },
      cookie: "SECRET_COOKIE",
    });

    const json = await readFile(artifacts.requestPath, "utf8");
    expect(json).toContain('"token": "[redacted]"');
    expect(json).toContain('"password": "[redacted]"');
    expect(json).toContain('"cookie": "[redacted]"');
    expect(json).toContain('"title": "Visible"');
  });

  it("redacts secret-like keys without changing normal payload text", () => {
    expect(
      redactForArtifact({
        apiKey: "key",
        appSecret: "secret",
        content: "article text",
        items: [{ accessToken: "token" }, { value: 1 }],
      }),
    ).toEqual({
      apiKey: "[redacted]",
      appSecret: "[redacted]",
      content: "article text",
      items: [{ accessToken: "[redacted]" }, { value: 1 }],
    });
  });
});
