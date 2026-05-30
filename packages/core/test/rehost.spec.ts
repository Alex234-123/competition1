import { describe, it, expect } from "vitest";
import { markdownToIR } from "../src/parse/md-to-ir.js";
import { syncToPlatforms } from "../src/sync/sync-engine.js";
import { rehostDocumentAssets } from "../src/assets/rehost-engine.js";
import { getAdapter } from "../src/adapters/registry.js";
import type { RehostContext } from "../src/adapters/types.js";

const fixedNow = () => "2026-01-01T00:00:00.000Z";
const WITH_IMG = "# 标题\n\n正文。\n\n![配图](https://orig.example.com/a.png)";

describe("rehostDocumentAssets — 资产重托管回填", () => {
  it("把上传结果回填到 asset.rehosted[platformId]", async () => {
    const doc = markdownToIR(WITH_IMG).document;
    const adapter = getAdapter("wechat")!;
    const ctx: RehostContext = {
      platformId: "wechat",
      upload: async () => ({ url: "https://mp.weixin.qq.com/rehosted.png", mediaId: "MEDIA_1" }),
    };
    const out = await rehostDocumentAssets(adapter, doc, ctx);
    const img = out.assets.find((a) => a.kind === "image");
    expect(img?.rehosted["wechat"]?.url).toBe("https://mp.weixin.qq.com/rehosted.png");
    expect(img?.rehosted["wechat"]?.mediaId).toBe("MEDIA_1");
  });

  it("幂等:已重托管的资产跳过 upload", async () => {
    const doc = markdownToIR(WITH_IMG).document;
    const adapter = getAdapter("wechat")!;
    let calls = 0;
    const ctx: RehostContext = {
      platformId: "wechat",
      upload: async () => {
        calls++;
        return { url: "https://mp/x.png" };
      },
    };
    const once = await rehostDocumentAssets(adapter, doc, ctx);
    const twice = await rehostDocumentAssets(adapter, once, ctx);
    expect(calls).toBe(1); // 第二次跳过
    expect(twice.assets.find((a) => a.kind === "image")?.rehosted["wechat"]?.url).toBe("https://mp/x.png");
  });

  it("单图上传失败不阻断,保留原始引用", async () => {
    const doc = markdownToIR(WITH_IMG).document;
    const adapter = getAdapter("wechat")!;
    const ctx: RehostContext = {
      platformId: "wechat",
      upload: async () => {
        throw new Error("网络错误");
      },
    };
    const out = await rehostDocumentAssets(adapter, doc, ctx);
    const img = out.assets.find((a) => a.kind === "image");
    expect(img?.rehosted["wechat"]).toBeUndefined();
    expect(img?.source.url).toBe("https://orig.example.com/a.png");
  });

  it("无图文档原样返回", async () => {
    const doc = markdownToIR("# 标题\n\n纯文字").document;
    const adapter = getAdapter("wechat")!;
    const ctx: RehostContext = { platformId: "wechat", upload: async () => ({ url: "x" }) };
    const out = await rehostDocumentAssets(adapter, doc, ctx);
    expect(out).toBe(doc);
  });

  it("跳过变换生成的占位资产(表格图/公式图)", async () => {
    // B站会把表格转为 generated 占位图;这类不应被重托管。
    const doc = markdownToIR("# 标题\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n![真图](https://e.com/real.png)").document;
    const adapter = getAdapter("bilibili")!;
    const processed = adapter.preprocess(doc);
    const uploadedSources: string[] = [];
    const ctx: RehostContext = {
      platformId: "bilibili",
      upload: async (asset) => {
        uploadedSources.push(asset.source.url ?? asset.source.dataUrl ?? "");
        return { url: "https://i0.hdslb.com/x.png" };
      },
    };
    await rehostDocumentAssets(adapter, processed, ctx);
    // 只应上传真实图,不含 table:/equation 占位。
    expect(uploadedSources.some((s) => s.includes("real.png"))).toBe(true);
    expect(uploadedSources.some((s) => s.startsWith("table:"))).toBe(false);
    expect(uploadedSources.some((s) => s.includes("equation"))).toBe(false);
  });
});

describe("syncToPlatforms — 重托管接线", () => {
  it("注入 rehost 后产物 img 指向重托管 URL", async () => {
    const doc = markdownToIR(WITH_IMG).document;
    const ctx: RehostContext = {
      platformId: "wechat",
      upload: async () => ({ url: "https://mp.weixin.qq.com/cdn/rehosted.png" }),
    };
    const results = await syncToPlatforms(doc, ["wechat"], {
      stageOnly: true,
      now: fixedNow,
      rehost: { wechat: ctx },
    });
    expect(results[0]!.artifact?.payload.content).toContain("https://mp.weixin.qq.com/cdn/rehosted.png");
  });

  it("不注入 rehost 时保留原始 URL(向后兼容)", async () => {
    const doc = markdownToIR(WITH_IMG).document;
    const results = await syncToPlatforms(doc, ["wechat"], { stageOnly: true, now: fixedNow });
    expect(results[0]!.artifact?.payload.content).toContain("https://orig.example.com/a.png");
  });
});

describe("BaseAdapter.rehostAsset — 默认实现", () => {
  it("调用 ctx.upload 并返回 {assetId,url,mediaId}", async () => {
    const doc = markdownToIR(WITH_IMG).document;
    const adapter = getAdapter("zhihu")!;
    const asset = doc.assets.find((a) => a.kind === "image")!;
    const ctx: RehostContext = {
      platformId: "zhihu",
      upload: async () => ({ url: "https://pic.zhimg.com/x.png", mediaId: "ZH_1" }),
    };
    const result = await adapter.rehostAsset(asset, ctx);
    expect(result.assetId).toBe(asset.id);
    expect(result.url).toBe("https://pic.zhimg.com/x.png");
    expect(result.mediaId).toBe("ZH_1");
  });

  it("upload 返回空对象时 url/mediaId 为 undefined", async () => {
    const doc = markdownToIR(WITH_IMG).document;
    const adapter = getAdapter("zhihu")!;
    const asset = doc.assets.find((a) => a.kind === "image")!;
    const ctx: RehostContext = { platformId: "zhihu", upload: async () => ({}) };
    const result = await adapter.rehostAsset(asset, ctx);
    expect(result.assetId).toBe(asset.id);
    expect(result.url).toBeUndefined();
    expect(result.mediaId).toBeUndefined();
  });
});
