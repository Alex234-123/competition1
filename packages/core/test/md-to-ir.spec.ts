import { describe, it, expect } from "vitest";
import { markdownToIR, splitInlineMath } from "../src/parse/md-to-ir.js";
import { inlinesToPlainText } from "../src/ir/guards.js";

describe("markdownToIR", () => {
  it("提取首个 H1 作为标题并从正文移除", () => {
    const { document } = markdownToIR("# 我的标题\n\n正文段落。");
    expect(document.meta.title).toBe("我的标题");
    expect(document.blocks).toHaveLength(1);
    expect(document.blocks[0]!.type).toBe("paragraph");
  });

  it("解析标题层级", () => {
    const { document } = markdownToIR("## 二级\n\n### 三级");
    expect(document.blocks[0]).toMatchObject({ type: "heading", level: 2 });
    expect(document.blocks[1]).toMatchObject({ type: "heading", level: 3 });
  });

  it("解析强调与行内代码", () => {
    const { document } = markdownToIR("**粗** 和 *斜* 和 `码`");
    const para = document.blocks[0]!;
    expect(para.type).toBe("paragraph");
    if (para.type === "paragraph") {
      const types = para.inlines.map((i) => i.type);
      expect(types).toContain("strong");
      expect(types).toContain("em");
      expect(types).toContain("code");
    }
  });

  it("解析链接保留 href", () => {
    const { document } = markdownToIR("[文字](https://example.com)");
    const para = document.blocks[0]!;
    if (para.type === "paragraph") {
      const link = para.inlines.find((i) => i.type === "link");
      expect(link).toMatchObject({ type: "link", href: "https://example.com" });
    }
  });

  it("解析无序与有序列表", () => {
    const { document } = markdownToIR("- a\n- b\n\n1. x\n2. y");
    const ul = document.blocks[0]!;
    const ol = document.blocks[1]!;
    expect(ul).toMatchObject({ type: "list", ordered: false });
    expect(ol).toMatchObject({ type: "list", ordered: true });
    if (ul.type === "list") expect(ul.items).toHaveLength(2);
  });

  it("解析引用块", () => {
    const { document } = markdownToIR("> 引用内容");
    expect(document.blocks[0]!.type).toBe("quote");
  });

  it("解析代码块带语言", () => {
    const { document } = markdownToIR("```ts\nconst a = 1;\n```");
    expect(document.blocks[0]).toMatchObject({ type: "codeBlock", lang: "ts" });
  });

  it("解析图片登记到资产表并以 assetId 引用", () => {
    const { document, assetTable } = markdownToIR("![替代](https://img.example.com/a.png)");
    const img = document.blocks.find((b) => b.type === "image");
    expect(img).toBeDefined();
    if (img && img.type === "image") {
      const asset = assetTable.get(img.assetId);
      expect(asset?.source.url).toBe("https://img.example.com/a.png");
    }
  });

  it("解析表格为 TableBlock", () => {
    const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const { document } = markdownToIR(md);
    const table = document.blocks.find((b) => b.type === "table");
    expect(table).toBeDefined();
    if (table && table.type === "table") {
      expect(table.header.map(inlinesToPlainText)).toEqual(["A", "B"]);
      expect(table.rows).toHaveLength(1);
      expect(table.rows[0]!.map(inlinesToPlainText)).toEqual(["1", "2"]);
    }
  });

  it("解析分隔线", () => {
    const { document } = markdownToIR("a\n\n---\n\nb");
    expect(document.blocks.some((b) => b.type === "divider")).toBe(true);
  });

  it("块级公式 $$..$$ 提升为 MathBlock", () => {
    const { document } = markdownToIR("$$E=mc^2$$");
    expect(document.blocks[0]).toMatchObject({ type: "math", tex: "E=mc^2" });
  });

  it("行内公式拆分为 inlineMath", () => {
    const inlines = splitInlineMath("当 $x=1$ 时");
    expect(inlines.some((i) => i.type === "inlineMath")).toBe(true);
  });

  it("不把孤立美元符号误判为公式", () => {
    const inlines = splitInlineMath("价格 $5 和 $10");
    expect(inlines.every((i) => i.type === "text")).toBe(true);
  });
});
