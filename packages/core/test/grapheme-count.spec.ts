import { describe, it, expect } from "vitest";
import { graphemeCount, graphemeTruncate } from "../src/transforms/grapheme-count.js";

describe("graphemeCount", () => {
  it("中文按字符计数", () => {
    expect(graphemeCount("你好世界")).toBe(4);
  });

  it("ASCII 按字符计数", () => {
    expect(graphemeCount("hello")).toBe(5);
  });

  it("简单 emoji 计为 1", () => {
    expect(graphemeCount("😀")).toBe(1);
  });

  it("ZWJ 组合 emoji 计为 1(而非多个码元)", () => {
    // 👨‍👩‍👧 在 UTF-16 下 length 为 8,字素簇应为 1。
    const family = "👨‍👩‍👧";
    expect(family.length).toBeGreaterThan(1);
    expect(graphemeCount(family)).toBe(1);
  });

  it("混合中英文 emoji", () => {
    expect(graphemeCount("hi你好😀")).toBe(5);
  });
});

describe("graphemeTruncate", () => {
  it("截断到指定字素数", () => {
    expect(graphemeTruncate("你好世界你好", 4)).toBe("你好世界");
  });

  it("不超长时原样返回", () => {
    expect(graphemeTruncate("短", 10)).toBe("短");
  });

  it("max 为 0 返回空串", () => {
    expect(graphemeTruncate("任意", 0)).toBe("");
  });

  it("不切断 ZWJ emoji", () => {
    const s = "a👨‍👩‍👧b";
    expect(graphemeTruncate(s, 2)).toBe("a👨‍👩‍👧");
  });
});
