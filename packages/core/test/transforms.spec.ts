import { describe, it, expect } from "vitest";
import { markdownToIR } from "../src/parse/md-to-ir.js";
import { linkToFootnote } from "../src/transforms/link-to-footnote.js";
import { mathToImage, equationImageUrl } from "../src/transforms/math-to-image.js";
import { tableToImage, parseTableAsset } from "../src/transforms/table-to-image.js";
import { bannedWordFilter, scanBannedWords } from "../src/transforms/banned-word-filter.js";
import { flattenToPlaintext } from "../src/transforms/flatten-to-plaintext.js";
import { runPipeline, type TransformContext } from "../src/transforms/pipeline.js";
import { buildPipeline } from "../src/transforms/registry.js";
import { wechatCapabilities } from "../src/adapters/wechat/capabilities.js";
import { zhihuCapabilities } from "../src/adapters/zhihu/capabilities.js";
import { xiaohongshuCapabilities } from "../src/adapters/xiaohongshu/capabilities.js";
import { bilibiliCapabilities } from "../src/adapters/bilibili/capabilities.js";
import { inlinesToPlainText } from "../src/ir/guards.js";
import type { Capabilities } from "../src/ir/types.js";

function ctxFor(cap: Capabilities, platformId = "test"): TransformContext {
  return { platformId, capabilities: cap };
}

describe("linkToFootnote", () => {
  it("公众号能力下把外链转脚注并追加序号", () => {
    const { document } = markdownToIR("见 [示例](https://example.com) 链接。");
    const out = linkToFootnote.run(document, ctxFor(wechatCapabilities));
    // 末尾应追加 divider + footnote。
    expect(out.blocks.some((b) => b.type === "footnote")).toBe(true);
    const para = out.blocks.find((b) => b.type === "paragraph");
    if (para && para.type === "paragraph") {
      expect(inlinesToPlainText(para.inlines)).toContain("[1]");
    }
  });

  it("知乎能力下不启用(支持外链)", () => {
    expect(linkToFootnote.applicable(zhihuCapabilities)).toBe(false);
  });
});

describe("mathToImage", () => {
  it("生成知乎 equation URL", () => {
    expect(equationImageUrl("E=mc^2")).toBe("https://www.zhihu.com/equation?tex=E%3Dmc%5E2");
  });

  it("知乎能力下把 MathBlock 转为 image", () => {
    const { document } = markdownToIR("$$E=mc^2$$");
    const out = mathToImage.run(document, ctxFor(zhihuCapabilities, "zhihu"));
    const img = out.blocks.find((b) => b.type === "image");
    expect(img).toBeDefined();
    if (img && img.type === "image") {
      const asset = out.assets.find((a) => a.id === img.assetId);
      expect(asset?.source.url).toContain("zhihu.com/equation");
    }
  });

  it("公众号能力下不启用(supportsMath==none)", () => {
    expect(mathToImage.applicable(wechatCapabilities)).toBe(false);
  });
});

describe("tableToImage", () => {
  it("B站能力下把表格转为 image 占位", () => {
    const { document } = markdownToIR("| A | B |\n| - | - |\n| 1 | 2 |");
    const out = tableToImage.run(document, ctxFor(bilibiliCapabilities, "bilibili"));
    const img = out.blocks.find((b) => b.type === "image");
    expect(img).toBeDefined();
    if (img && img.type === "image") {
      const asset = out.assets.find((a) => a.id === img.assetId);
      const grid = parseTableAsset(asset!.source.dataUrl ?? "");
      expect(grid?.header).toEqual(["A", "B"]);
      expect(grid?.rows).toEqual([["1", "2"]]);
    }
  });

  it("知乎能力下不启用(支持表格)", () => {
    expect(tableToImage.applicable(zhihuCapabilities)).toBe(false);
  });
});

describe("bannedWordFilter", () => {
  it("扫描命中极限词", () => {
    const { document } = markdownToIR("这是最佳方案,绝对第一。");
    const hits = scanBannedWords(document);
    const words = hits.map((h) => h.word);
    expect(words).toContain("最佳");
    expect(words).toContain("绝对");
    expect(words).toContain("第一");
  });

  it("小红书能力下替换极限词", () => {
    const { document } = markdownToIR("这是最佳方案。");
    const out = bannedWordFilter.run(document, ctxFor(xiaohongshuCapabilities, "xiaohongshu"));
    const text = out.blocks.map((b) => (b.type === "paragraph" ? inlinesToPlainText(b.inlines) : "")).join("");
    expect(text).not.toContain("最佳");
    expect(text).toContain("很好");
  });
});

describe("flattenToPlaintext", () => {
  it("把标题转为 emoji 引导行,列表转符号行", () => {
    const { document } = markdownToIR("正文\n\n## 小标题\n\n- 项目一\n- 项目二");
    const out = flattenToPlaintext.run(document, ctxFor(xiaohongshuCapabilities, "xiaohongshu"));
    const para = out.blocks.find((b) => b.type === "paragraph");
    expect(para).toBeDefined();
    if (para && para.type === "paragraph") {
      const text = inlinesToPlainText(para.inlines);
      expect(text).toContain("✨ 小标题"); // level-2 emoji
      expect(text).toContain("✅ 项目一");
    }
  });

  it("保留图片块供小红书收集", () => {
    const { document } = markdownToIR("文字\n\n![图](https://e.com/i.png)");
    const out = flattenToPlaintext.run(document, ctxFor(xiaohongshuCapabilities, "xiaohongshu"));
    expect(out.blocks.some((b) => b.type === "image")).toBe(true);
  });
});

describe("runPipeline 边界", () => {
  it("applicable 返回 false 时跳过变换", () => {
    const { document } = markdownToIR("普通文本。");
    const called: string[] = [];
    const transforms = [
      {
        name: "always-skip",
        applicable: () => false,
        run: (doc: typeof document) => { called.push("run"); return doc; },
      },
      {
        name: "always-apply",
        applicable: () => true,
        run: (doc: typeof document) => { called.push("run2"); return doc; },
      },
    ];
    const out = runPipeline(transforms, document, ctxFor(wechatCapabilities, "wechat"));
    expect(called).toEqual(["run2"]);
    expect(out).toBeDefined();
  });
});

describe("buildPipeline", () => {
  it("公众号管线含 link-to-footnote,不含 flatten", () => {
    const names = buildPipeline(wechatCapabilities).map((t) => t.name);
    expect(names).toContain("link-to-footnote");
    expect(names).not.toContain("flatten-to-plaintext");
  });

  it("小红书管线含 banned-word-filter 与 flatten(顺序:flatten 在最后)", () => {
    const names = buildPipeline(xiaohongshuCapabilities).map((t) => t.name);
    expect(names).toContain("banned-word-filter");
    expect(names[names.length - 1]).toBe("flatten-to-plaintext");
  });

  it("runPipeline 顺序应用变换", () => {
    const { document } = markdownToIR("最佳内容\n\n## 标题");
    const cap = xiaohongshuCapabilities;
    const out = runPipeline(buildPipeline(cap), document, ctxFor(cap, "xiaohongshu"));
    const para = out.blocks.find((b) => b.type === "paragraph");
    if (para && para.type === "paragraph") {
      const text = inlinesToPlainText(para.inlines);
      expect(text).not.toContain("最佳"); // 违禁词已替换
    }
  });
});
