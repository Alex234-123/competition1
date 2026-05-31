import { describe, expect, it } from "vitest";
import {
  isAutomationMode,
  isAutomationPlatformId,
  isAutomationPublishReceipt,
  parseAutomationPublishRequest,
} from "../src/types.js";

describe("automation contracts", () => {
  it("recognizes supported modes and platforms", () => {
    expect(isAutomationMode("draft")).toBe(true);
    expect(isAutomationMode("full-auto")).toBe(true);
    expect(isAutomationMode("mock")).toBe(false);

    expect(isAutomationPlatformId("zhihu")).toBe(true);
    expect(isAutomationPlatformId("bilibili")).toBe(true);
    expect(isAutomationPlatformId("xiaohongshu")).toBe(true);
    expect(isAutomationPlatformId("douyin")).toBe(false);
  });

  it("parses a valid automation publish request", () => {
    const req = parseAutomationPublishRequest({
      platformId: "zhihu",
      mode: "full-auto",
      payload: { title: "Title", content: "<p>Body</p>", mime: "text/html" },
      options: { headless: false, timeoutMs: 30_000 },
    });

    expect(req).toEqual({
      platformId: "zhihu",
      mode: "full-auto",
      payload: { title: "Title", content: "<p>Body</p>", mime: "text/html" },
      options: { headless: false, timeoutMs: 30_000 },
    });
  });

  it("rejects invalid automation publish requests", () => {
    expect(() => parseAutomationPublishRequest({ platformId: "douyin", mode: "full-auto", payload: {} })).toThrow(
      "unsupported platformId",
    );
    expect(() => parseAutomationPublishRequest({ platformId: "zhihu", mode: "mock", payload: {} })).toThrow(
      "unsupported automation mode",
    );
    expect(() => parseAutomationPublishRequest({ platformId: "zhihu", mode: "draft" })).toThrow(
      "payload must be an object",
    );
  });

  it("validates automation publish receipts", () => {
    expect(
      isAutomationPublishReceipt({
        ok: true,
        status: "published",
        message: "ok",
        remoteUrl: "https://example.test/post/1",
      }),
    ).toBe(true);

    expect(isAutomationPublishReceipt({ ok: true, status: "mock", message: "ok" })).toBe(false);
    expect(isAutomationPublishReceipt({ ok: "yes", status: "published", message: "ok" })).toBe(false);
  });
});
