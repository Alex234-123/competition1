import { describe, it, expect } from "vitest";
import { markdownToIR } from "../src/parse/md-to-ir.js";
import { getAdapter, listAdapters, listPlatformIds } from "../src/adapters/registry.js";
import { createMinimalTheme } from "../src/adapters/wechat/theme.js";
import { instructionsFor } from "../src/publish/instructions.js";

const SAMPLE = `# 一篇关于效率工具的分享

这是正文第一段,包含一个 [外部链接](https://example.com)。

## 小标题

- 要点一
- 要点二

| 平台 | 格式 |
| --- | --- |
| 公众号 | HTML |

\`\`\`ts
const x = 1;
\`\`\`

行内公式 $a^2+b^2=c^2$ 与块级:

$$\\int_0^1 x\\,dx$$

![配图](https://img.example.com/cover.png)
`;

function parse() {
  return markdownToIR(SAMPLE).document;
}

describe("适配器注册表", () => {
  it("注册了四个内置平台", () => {
    expect(listPlatformIds().sort()).toEqual(["bilibili", "wechat", "xiaohongshu", "zhihu"]);
    expect(listAdapters()).toHaveLength(4);
  });
});

describe("公众号适配器", () => {
  it("产出全内联样式 HTML,无 class/无 style 块", () => {
    const a = getAdapter("wechat")!;
    const doc = a.preprocess(parse());
    const payload = a.serialize(doc);
    expect(payload.mime).toBe("text/html");
    expect(payload.content).toContain("style=");
    expect(payload.content).not.toContain("<style");
    expect(payload.content).not.toContain('class="');
  });

  it("外链已转脚注", () => {
    const a = getAdapter("wechat")!;
    const doc = a.preprocess(parse());
    const payload = a.serialize(doc);
    expect(payload.content).toContain("[1]");
    expect(payload.content).toContain("example.com");
  });

  it("标题截断到 64 字以内并保留", () => {
    const a = getAdapter("wechat")!;
    const payload = a.serialize(a.preprocess(parse()));
    expect(payload.title).toBe("一篇关于效率工具的分享");
  });
});

describe("知乎适配器", () => {
  it("公式转 equation 图片,保留外链", () => {
    const a = getAdapter("zhihu")!;
    const payload = a.serialize(a.preprocess(parse()));
    expect(payload.content).toContain("zhihu.com/equation");
    expect(payload.content).toContain("example.com"); // 外链保留
  });

  it("话题截断到 ≤3", () => {
    const a = getAdapter("zhihu")!;
    const doc = markdownToIR("# t\n\n正文").document;
    const payload = a.serialize(a.preprocess(doc), { tags: ["a", "b", "c", "d", "e"] });
    expect(payload.tags).toHaveLength(3);
  });
});

describe("B站适配器", () => {
  it("表格转图片,派生 category/tid/words", () => {
    const a = getAdapter("bilibili")!;
    const payload = a.serialize(a.preprocess(parse()), { tags: ["科技"] });
    expect(payload.content).not.toContain("<table"); // 表格已转图
    expect(payload.extra?.["category"]).toBe("科技");
    expect(payload.extra?.["tid"]).toBe(201);
    expect(typeof payload.extra?.["words"]).toBe("number");
  });
});

describe("小红书适配器", () => {
  it("产出纯文本 + #话题#,标题 ≤20 字", () => {
    const a = getAdapter("xiaohongshu")!;
    const payload = a.serialize(a.preprocess(parse()), { tags: ["效率", "工具"] });
    expect(payload.mime).toBe("text/plain");
    expect(payload.content).not.toContain("<");
    expect(payload.content).toContain("#效率#");
    expect([...payload.title].length).toBeLessThanOrEqual(20);
  });

  it("emoji 引导行存在", () => {
    const a = getAdapter("xiaohongshu")!;
    const payload = a.serialize(a.preprocess(parse()));
    expect(payload.content).toMatch(/[✨📌🔸]/u);
  });

  it("正文超 1000 字时标记 overflow", () => {
    const a = getAdapter("xiaohongshu")!;
    const long = "# 标题\n\n" + "内容很长。".repeat(300); // 远超 1000 字
    const doc = markdownToIR(long).document;
    const payload = a.serialize(a.preprocess(doc));
    expect(payload.extra?.["overflow"]).toBe(true);
    expect([...payload.content].length).toBeLessThanOrEqual(1000);
  });
});

describe("公众号主题", () => {
  it("未知标签返回空字符串", () => {
    const theme = createMinimalTheme();
    expect(theme.styleFor("nonexistent-tag")).toBe("");
  });
});

describe("instructionsFor", () => {
  it("已知平台返回指引", () => {
    expect(instructionsFor("wechat")).toHaveLength(4);
    expect(instructionsFor("wechat")[0]).toContain("模拟发布");
  });

  it("未知平台返回默认指引", () => {
    const result = instructionsFor("unknown-platform");
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("默认走模拟发布");
  });
});
