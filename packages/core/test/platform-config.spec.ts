import { describe, it, expect } from "vitest";
import { resolveConfig } from "../src/config/platform-config.js";
import { DEFAULT_BANNED_WORDS } from "../src/transforms/banned-word-filter.js";
import { validate } from "../src/validate/validator.js";
import { getAdapter } from "../src/adapters/registry.js";
import { markdownToIR } from "../src/parse/md-to-ir.js";

describe("resolveConfig — 配置外置", () => {
  it("不传 override 时回退内置违禁词表与平台 limits", () => {
    const r = resolveConfig({ titleMax: 64, bodyMax: 50000 });
    expect(r.bannedWords).toBe(DEFAULT_BANNED_WORDS);
    expect(r.limits.titleMax).toBe(64);
    expect(r.limits.bodyMax).toBe(50000);
  });

  it("override 部分 limits 字段,未给字段保留平台默认", () => {
    const r = resolveConfig({ titleMax: 64, bodyMax: 50000 }, { limits: { titleMax: 30 } });
    expect(r.limits.titleMax).toBe(30); // 覆盖
    expect(r.limits.bodyMax).toBe(50000); // 保留
  });

  it("override 违禁词表完全替换内置", () => {
    const custom = ["自定义违禁词"];
    const r = resolveConfig({}, { bannedWords: custom });
    expect(r.bannedWords).toBe(custom);
  });
});

describe("validate — 注入配置生效", () => {
  it("自定义违禁词被校验检出(小红书)", () => {
    const a = getAdapter("xiaohongshu")!;
    const doc = markdownToIR("# 标题\n\n这里有一个特殊营销词在正文").document;
    const config = { bannedWords: ["特殊营销词"] };
    const processed = a.preprocess(doc, undefined, config);
    const payload = a.serialize(processed, undefined);
    const report = validate("xiaohongshu", processed, payload, a.capabilities, doc, config);
    const bannedIssue = report.issues.find((i) => i.code === "banned-word");
    expect(bannedIssue).toBeDefined();
    expect(bannedIssue?.message).toContain("特殊营销词");
  });

  it("override titleMax 收紧后触发标题超长错误", () => {
    const a = getAdapter("wechat")!;
    const doc = markdownToIR("# 这是一个相当长的中文标题用于测试\n\n正文").document;
    const payload = a.serialize(a.preprocess(doc));
    // 默认 titleMax=64 不触发;override 到 5 应触发 error。
    const report = validate("wechat", doc, payload, a.capabilities, doc, { limits: { titleMax: 5 } });
    const titleIssue = report.issues.find((i) => i.code === "title-too-long");
    expect(titleIssue).toBeDefined();
    expect(titleIssue?.severity).toBe("error");
  });

  it("不传 config 时校验行为与既有一致(回归)", () => {
    const a = getAdapter("wechat")!;
    const doc = markdownToIR("# 正常标题\n\n正文").document;
    const payload = a.serialize(a.preprocess(doc));
    const report = validate("wechat", doc, payload, a.capabilities, doc);
    expect(report.issues.find((i) => i.code === "title-too-long")).toBeUndefined();
  });
});
