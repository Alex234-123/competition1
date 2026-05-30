import { describe, it, expect } from "vitest";
import { sanitizeHtml, shouldSanitize } from "../src/adapters/shared/sanitize-html.js";

describe("sanitizeHtml — 净化护栏", () => {
  it("删除 <script> 标签及其内容", () => {
    const out = sanitizeHtml('<p>正文</p><script>alert(1)</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<p>正文</p>");
  });

  it("剥离 on* 事件处理器属性", () => {
    const out = sanitizeHtml('<img src="x.png" onerror="alert(1)" alt="图" />');
    expect(out).not.toContain("onerror");
    expect(out).toContain('src="x.png"');
    expect(out).toContain('alt="图"');
  });

  it("清空 javascript: 协议的 href", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">点我</a>');
    expect(out).not.toContain("javascript:");
    expect(out).toContain("点我");
  });

  it("剥离 style 内的 expression() 注入", () => {
    const out = sanitizeHtml('<p style="width:expression(alert(1))">x</p>');
    expect(out).not.toContain("expression");
  });

  it("保留白名单标签的合法内联 style(公众号刚需)", () => {
    const out = sanitizeHtml('<p style="color:#333;font-size:16px">正文</p>');
    expect(out).toContain('style="color:#333;font-size:16px"');
  });

  it("非白名单标签脱壳但保留内部文本", () => {
    const out = sanitizeHtml("<marquee>滚动文字</marquee>");
    expect(out).not.toContain("<marquee");
    expect(out).toContain("滚动文字");
  });

  it("删除 <iframe> 等危险嵌入标签及内容", () => {
    const out = sanitizeHtml('<iframe src="evil"></iframe><p>ok</p>');
    expect(out).not.toContain("iframe");
    expect(out).toContain("<p>ok</p>");
  });

  it("保留表格结构与 colspan", () => {
    const out = sanitizeHtml('<table><tr><td colspan="2">a</td></tr></table>');
    expect(out).toContain("<table>");
    expect(out).toContain('colspan="2"');
  });

  it("空输入返回空串", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("shouldSanitize 仅对 text/html 为真", () => {
    expect(shouldSanitize("text/html")).toBe(true);
    expect(shouldSanitize("text/plain")).toBe(false);
  });
});

describe("sanitizeHtml — 适配器集成", () => {
  it("公众号产物经 BaseAdapter 净化(无脚本残留)", async () => {
    const { getAdapter } = await import("../src/adapters/registry.js");
    const { markdownToIR } = await import("../src/parse/md-to-ir.js");
    const a = getAdapter("wechat")!;
    const doc = markdownToIR("# 标题\n\n正文段落").document;
    const payload = a.serialize(a.preprocess(doc));
    // 公众号产物是内联 HTML,净化后仍应保留 style。
    expect(payload.content).toContain("style=");
    expect(payload.content).not.toContain("<script");
  });
});
