import { describe, it, expect, vi } from "vitest";
import { OpenAiCompatLlm } from "../src/llm/openai-compat-llm.js";
import { NoopLlm } from "../src/llm/noop-llm.js";
import { enhancePayload } from "../src/llm/enhance.js";
import { getAdapter } from "../src/adapters/registry.js";
import { markdownToIR } from "../src/parse/md-to-ir.js";
import type { SerializedPayload } from "../src/adapters/types.js";

/** 构造 mock fetch,返回固定 chat completion。 */
function mockFetch(content: string, capture?: (url: string, body: unknown) => void) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    capture?.(url, init?.body ? JSON.parse(String(init.body)) : undefined);
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content } }] }),
    } as Response;
  }) as unknown as typeof fetch;
}

describe("OpenAiCompatLlm", () => {
  it("available 取决于 apiKey/baseUrl/model 是否齐全", () => {
    expect(new OpenAiCompatLlm({ baseUrl: "https://x/v1", apiKey: "", model: "m" }).available).toBe(false);
    expect(new OpenAiCompatLlm({ baseUrl: "https://x/v1", apiKey: "k", model: "m" }).available).toBe(true);
  });

  it("构造正确的 chat completion 请求并解析响应", async () => {
    let capturedUrl = "";
    let capturedBody: any;
    const llm = new OpenAiCompatLlm({
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "sk-test",
      model: "deepseek-chat",
      fetchImpl: mockFetch("绝绝子!这个神器太香了", (u, b) => {
        capturedUrl = u;
        capturedBody = b;
      }),
    });
    const out = await llm.run({ task: "title", platformId: "xiaohongshu", input: "效率工具分享", constraints: { maxChars: 20 } });
    expect(capturedUrl).toBe("https://api.deepseek.com/v1/chat/completions");
    expect(capturedBody.model).toBe("deepseek-chat");
    expect(capturedBody.messages).toHaveLength(2);
    expect(capturedBody.messages[1].content).toContain("效率工具分享");
    expect(out).toBe("绝绝子!这个神器太香了");
  });

  it("无 key 时透传输入(等价 Noop)", async () => {
    const llm = new OpenAiCompatLlm({ baseUrl: "https://x/v1", apiKey: "", model: "m" });
    const out = await llm.run({ task: "rewrite", platformId: "zhihu", input: "原文不变" });
    expect(out).toBe("原文不变");
  });

  it("HTTP 错误时抛异常", async () => {
    const llm = new OpenAiCompatLlm({
      baseUrl: "https://x/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: vi.fn(async () => ({ ok: false, status: 401 }) as Response) as unknown as typeof fetch,
    });
    await expect(llm.run({ task: "title", platformId: "x", input: "y" })).rejects.toThrow("HTTP 401");
  });

  it("空响应回退原文", async () => {
    const llm = new OpenAiCompatLlm({
      baseUrl: "https://x/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: mockFetch(""),
    });
    const out = await llm.run({ task: "summary", platformId: "x", input: "保留这段" });
    expect(out).toBe("保留这段");
  });
});

describe("enhancePayload", () => {
  function basePayload(): SerializedPayload {
    return {
      content: "这是一段需要被口语化改写的正式正文内容。",
      mime: "text/plain",
      title: "原标题",
      tags: ["效率"],
      imageAssetIds: [],
    };
  }

  it("不可用 LLM 时原样返回", async () => {
    const a = getAdapter("xiaohongshu")!;
    const out = await enhancePayload("xiaohongshu", basePayload(), a.capabilities, new NoopLlm(), {
      title: true,
      colloquialize: true,
    });
    expect(out.title).toBe("原标题");
  });

  it("可用 LLM 优化标题并按上限截断", async () => {
    const a = getAdapter("xiaohongshu")!; // titleMax=20
    const longTitle = "这是一个被AI改写后超过二十个字符上限的超长爆款标题内容需要被截断";
    const llm = new OpenAiCompatLlm({
      baseUrl: "https://x/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: mockFetch(longTitle),
    });
    const out = await enhancePayload("xiaohongshu", basePayload(), a.capabilities, llm, { title: true });
    expect([...out.title].length).toBeLessThanOrEqual(20);
  });

  it("plaintext 平台口语化正文;HTML 平台不动正文", async () => {
    const xhs = getAdapter("xiaohongshu")!;
    const wechat = getAdapter("wechat")!;
    const llm = new OpenAiCompatLlm({
      baseUrl: "https://x/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: mockFetch("宝子们!这个方法真的绝了"),
    });
    const xhsOut = await enhancePayload("xiaohongshu", basePayload(), xhs.capabilities, llm, { colloquialize: true });
    expect(xhsOut.content).toContain("宝子们");

    const htmlPayload: SerializedPayload = { ...basePayload(), mime: "text/html", content: "<p>正文</p>" };
    const wechatOut = await enhancePayload("wechat", htmlPayload, wechat.capabilities, llm, { colloquialize: true });
    expect(wechatOut.content).toBe("<p>正文</p>"); // HTML 正文不被口语化
  });

  it("生成摘要(summary)并按上限截断", async () => {
    const wechat = getAdapter("wechat")!; // summaryMax 存在
    const longSummary = "这是一段由 AI 生成的相当长的摘要内容用于验证会被按平台 summaryMax 上限正确截断不至于超长溢出影响展示效果。".repeat(3);
    const llm = new OpenAiCompatLlm({
      baseUrl: "https://x/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: mockFetch(longSummary),
    });
    const out = await enhancePayload("wechat", basePayload(), wechat.capabilities, llm, { summary: true });
    expect(out.summary).toBeTruthy();
    const max = wechat.capabilities.limits.summaryMax;
    if (max) expect([...out.summary!].length).toBeLessThanOrEqual(max);
  });

  it("LLM 抛错时各字段回退原值(不破坏发布链路)", async () => {
    const xhs = getAdapter("xiaohongshu")!;
    const llm = new OpenAiCompatLlm({
      baseUrl: "https://x/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: vi.fn(async () => ({ ok: false, status: 500 }) as Response) as unknown as typeof fetch,
    });
    const out = await enhancePayload("xiaohongshu", basePayload(), xhs.capabilities, llm, {
      title: true,
      summary: true,
      colloquialize: true,
    });
    expect(out.title).toBe("原标题"); // 回退
    expect(out.content).toBe(basePayload().content); // 回退
  });

  it("无上限能力 + 空标题:不截断且用正文作标题输入", async () => {
    // 构造无 titleMax/summaryMax/bodyMax 的 plaintext 能力,覆盖"无 limit 不截断"分支。
    const cap = {
      contentModel: "plaintext" as const,
      limits: {},
      supportsImages: true,
      supportsTags: true,
    } as unknown as Parameters<typeof enhancePayload>[2];
    const llm = new OpenAiCompatLlm({
      baseUrl: "https://x/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: mockFetch("不截断的完整输出"),
    });
    const emptyTitle: SerializedPayload = { ...basePayload(), title: "" };
    const out = await enhancePayload("x", emptyTitle, cap, llm, {
      title: true,
      summary: true,
      colloquialize: true,
    });
    expect(out.title).toBe("不截断的完整输出"); // 无 titleMax,不截断
    expect(out.summary).toBe("不截断的完整输出"); // 无 summaryMax,不截断
    expect(out.content).toBe("不截断的完整输出"); // 无 bodyMax,不截断
  });
});

describe("syncToPlatforms — LLM 增强接线", () => {
  it("注入 llm + enhance 后标题被改写", async () => {
    const { syncToPlatforms } = await import("../src/sync/sync-engine.js");
    const doc = markdownToIR("# 普通标题\n\n正文\n\n![图](https://e.com/a.png)").document;
    const llm = new OpenAiCompatLlm({
      baseUrl: "https://x/v1",
      apiKey: "k",
      model: "m",
      fetchImpl: mockFetch("AI优化后的标题"),
    });
    const results = await syncToPlatforms(doc, ["wechat"], {
      stageOnly: true,
      now: () => "2026-01-01T00:00:00.000Z",
      llm,
      enhance: { title: true },
    });
    expect(results[0]!.artifact?.payload.title).toBe("AI优化后的标题");
  });

  it("不注入 llm 时标题不变(向后兼容)", async () => {
    const { syncToPlatforms } = await import("../src/sync/sync-engine.js");
    const doc = markdownToIR("# 普通标题\n\n正文").document;
    const results = await syncToPlatforms(doc, ["wechat"], { stageOnly: true, now: () => "t" });
    expect(results[0]!.artifact?.payload.title).toBe("普通标题");
  });
});
