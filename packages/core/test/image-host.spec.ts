import { describe, it, expect } from "vitest";
import { decodeDataUrl, assetFilename } from "../src/assets/image-host.js";
import type { Asset } from "../src/ir/types.js";

describe("image-host 辅助函数", () => {
  it("decodeDataUrl 解码 base64 dataURL", () => {
    // "AB" 的 base64 是 "QUI="
    const out = decodeDataUrl("data:image/png;base64,QUI=");
    expect(out).not.toBeNull();
    expect(out!.mime).toBe("image/png");
    expect(Array.from(out!.bytes)).toEqual([65, 66]); // 'A','B'
  });

  it("decodeDataUrl 解码非 base64(URI 编码)dataURL", () => {
    const out = decodeDataUrl("data:text/plain,Hello%20World");
    expect(out).not.toBeNull();
    expect(out!.mime).toBe("text/plain");
    expect(new TextDecoder().decode(out!.bytes)).toBe("Hello World");
  });

  it("decodeDataUrl 对非法输入返回 null", () => {
    expect(decodeDataUrl("not-a-data-url")).toBeNull();
    expect(decodeDataUrl("https://example.com/a.png")).toBeNull();
  });

  it("decodeDataUrl 空 mime 段不被接受(返回 null)", () => {
    // 正则要求 mime 段至少 1 个非分隔符字符;data:;base64,... 不匹配。
    expect(decodeDataUrl("data:;base64,QUI=")).toBeNull();
  });

  it("assetFilename 按 mime 推断扩展名", () => {
    const mk = (mime?: string): Asset =>
      ({ id: "a1", kind: "image", mime, source: {} }) as unknown as Asset;
    expect(assetFilename(mk("image/png"))).toBe("a1.png");
    expect(assetFilename(mk("image/jpeg"))).toBe("a1.jpg");
    expect(assetFilename(mk("image/gif"))).toBe("a1.gif");
    expect(assetFilename(mk("image/webp"))).toBe("a1.webp");
    expect(assetFilename(mk(undefined))).toBe("a1.png"); // 缺省回退 png
    expect(assetFilename(mk("image/svg+xml"))).toBe("a1.png"); // 未知回退 png
  });
});
