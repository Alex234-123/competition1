import { describe, it, expect } from "vitest";
import { markdownToIR } from "../src/parse/md-to-ir.js";
import { getAdapter } from "../src/adapters/registry.js";
import { validate } from "../src/validate/validator.js";

function run(platformId: string, md: string, override = {}) {
  const a = getAdapter(platformId)!;
  const raw = markdownToIR(md).document;
  const doc = a.preprocess(raw, override);
  const payload = a.serialize(doc, override);
  return validate(platformId, doc, payload, a.capabilities, raw);
}

describe("校验器", () => {
  it("小红书:无图无封面报 error(必须有图)", () => {
    const report = run("xiaohongshu", "# 标题\n\n纯文字无图");
    expect(report.hasError).toBe(true);
    expect(report.issues.some((i) => i.code === "cover-missing")).toBe(true);
  });

  it("小红书:有正文配图则不报无图 error", () => {
    const report = run("xiaohongshu", "# 标题\n\n正文\n\n![图](https://e.com/i.png)");
    expect(report.issues.some((i) => i.code === "cover-missing")).toBe(false);
  });

  it("小红书:标题超 20 字报 error", () => {
    const longTitle = "这是一个非常非常非常非常非常非常长的标题超过二十个字了哦";
    const a = getAdapter("xiaohongshu")!;
    const doc = a.preprocess(markdownToIR("正文").document);
    // 直接构造超长标题 payload 走校验(序列化会截断,这里测校验规则本身)。
    const payload = { ...a.serialize(doc), title: longTitle, coverAssetId: "c1" };
    const report = validate("xiaohongshu", doc, payload, a.capabilities);
    expect(report.issues.some((i) => i.code === "title-too-long")).toBe(true);
  });

  it("公众号:摘要过长报 warning", () => {
    const a = getAdapter("wechat")!;
    const doc = a.preprocess(markdownToIR("# t\n\n正文").document);
    const payload = { ...a.serialize(doc), summary: "字".repeat(200), coverAssetId: "c1" };
    const report = validate("wechat", doc, payload, a.capabilities);
    expect(report.issues.some((i) => i.code === "summary-too-long" && i.severity === "warning")).toBe(true);
  });

  it("小红书:命中违禁词产 warning", () => {
    const report = run("xiaohongshu", "# 最佳神器\n\n![图](https://e.com/i.png)");
    expect(report.issues.some((i) => i.code === "banned-word")).toBe(true);
  });

  it("标题为空报 error", () => {
    const a = getAdapter("wechat")!;
    const doc = a.preprocess(markdownToIR("正文无标题").document);
    const payload = { ...a.serialize(doc), title: "" };
    const report = validate("wechat", doc, payload, a.capabilities);
    expect(report.issues.some((i) => i.code === "title-empty")).toBe(true);
  });
});
