import { describe, expect, it } from "vitest";
import { buildCoverSpec } from "../src/transforms/cover-spec.js";
import { markdownToIR } from "../src/parse/md-to-ir.js";
import type { Document } from "../src/ir/types.js";

const base = markdownToIR("# 我的封面标题\n\n正文内容").document;

/** 在合法 doc 基础上覆盖 meta 字段,生成测试变体。 */
function withMeta(patch: Partial<Document["meta"]>): Document {
  return { ...base, meta: { ...base.meta, ...patch } };
}

describe("buildCoverSpec", () => {
  it("默认 options:3:4 比例、默认尺寸与颜色、subtitle 缺省", () => {
    const spec = buildCoverSpec(base);
    expect(spec.ratio).toBe("3:4");
    expect(spec.width).toBe(1080);
    expect(spec.height).toBe(1440);
    expect(spec.title).toBe("我的封面标题");
    expect(spec.accent).toBe("#FF2442");
    expect(spec.background).toBe("#FFFFFF");
    expect(spec.textColor).toBe("#222222");
    expect(spec.subtitle).toBeUndefined();
  });

  it.each([
    ["1:1", 1080, 1080],
    ["4:3", 1200, 900],
    ["2.35:1", 1080, 460],
    ["16:9", 1280, 720],
  ] as const)("比例 %s 映射到正确像素尺寸", (ratio, width, height) => {
    const spec = buildCoverSpec(base, { ratio });
    expect(spec.ratio).toBe(ratio);
    expect(spec.width).toBe(width);
    expect(spec.height).toBe(height);
  });

  it("无标题时回退到「未命名内容」", () => {
    const spec = buildCoverSpec(withMeta({ title: "" }));
    expect(spec.title).toBe("未命名内容");
  });

  it("透传 subtitle", () => {
    const spec = buildCoverSpec(withMeta({ subtitle: "一句话副标题" }));
    expect(spec.subtitle).toBe("一句话副标题");
  });

  it("超长标题按 titleMax 字素截断", () => {
    const spec = buildCoverSpec(withMeta({ title: "封".repeat(50) }), { titleMax: 10 });
    expect(spec.title).toBe("封".repeat(10));
  });

  it("短标题在默认 titleMax(24) 下不被截断", () => {
    const spec = buildCoverSpec(withMeta({ title: "短标题" }));
    expect(spec.title).toBe("短标题");
  });

  it("自定义 accent/background/textColor 覆盖默认值", () => {
    const spec = buildCoverSpec(base, {
      accent: "#000000",
      background: "#101010",
      textColor: "#FAFAFA",
    });
    expect(spec.accent).toBe("#000000");
    expect(spec.background).toBe("#101010");
    expect(spec.textColor).toBe("#FAFAFA");
  });
});
