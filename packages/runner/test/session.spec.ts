import { describe, expect, it } from "vitest";
import { resolveProfileDir } from "../src/browser/session.js";

describe("browser session helpers", () => {
  it("isolates persistent browser profiles by platform", () => {
    const root = "E:/tmp/mpp-profiles";

    expect(resolveProfileDir(root, "zhihu")).toBe("E:\\tmp\\mpp-profiles\\zhihu");
    expect(resolveProfileDir(root, "bilibili")).toBe("E:\\tmp\\mpp-profiles\\bilibili");
    expect(resolveProfileDir(root, "xiaohongshu")).not.toBe(resolveProfileDir(root, "zhihu"));
  });

  it("allows an explicit profile override", () => {
    expect(resolveProfileDir("E:/tmp/default", "zhihu", "E:/tmp/custom-zhihu")).toBe("E:\\tmp\\custom-zhihu");
  });
});
