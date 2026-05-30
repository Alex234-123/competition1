/**
 * 公式 → 图片变换。
 *
 * 知乎不渲染从 Markdown 导入的 $...$/$$...$$,业界做法(md2zhihu)是把每个公式转成
 * 指向 https://www.zhihu.com/equation?tex=<URL编码TeX> 的图片。本变换在 supportsMath==='image'
 * 时,把 InlineMath/MathBlock 转为 image(通过资产表登记 equation URL)。
 */
import type { Block, Inline } from "../ir/types.js";
import { AssetTable, assetTableFrom } from "../assets/asset-table.js";
import type { Transform } from "./pipeline.js";

const ZHIHU_EQUATION = "https://www.zhihu.com/equation?tex=";

export function equationImageUrl(tex: string): string {
  return ZHIHU_EQUATION + encodeURIComponent(tex);
}

export const mathToImage: Transform = {
  name: "math-to-image",
  applicable: (cap) => cap.supportsMath === "image",
  run(doc) {
    const assets = assetTableFrom(doc.assets);
    const blocks = doc.blocks.map((b) => transformBlock(b, assets));
    return { ...doc, blocks, assets: assets.all() };
  },
};

function transformBlock(block: Block, assets: AssetTable): Block {
  switch (block.type) {
    case "math": {
      const id = assets.add("image", { url: equationImageUrl(block.tex), generated: true }, {});
      return { type: "image", assetId: id, alt: block.tex };
    }
    case "paragraph":
    case "heading":
      return { ...block, inlines: transformInlines(block.inlines, assets) };
    case "quote":
      return { ...block, blocks: block.blocks.map((b) => transformBlock(b, assets)) };
    case "list":
      return { ...block, items: block.items.map((item) => item.map((b) => transformBlock(b, assets))) };
    default:
      return block;
  }
}

function transformInlines(inlines: readonly Inline[], assets: AssetTable): Inline[] {
  return inlines.map((inline) => {
    if (inline.type === "inlineMath") {
      // 行内公式降级为带 URL 的链接文字标记(行内无法塞 image 块);保留 tex 文本。
      return { type: "text", value: ` [公式:${inline.tex}] ` };
    }
    if (inline.type === "strong" || inline.type === "em") {
      return { ...inline, children: transformInlines(inline.children, assets) };
    }
    return inline;
  });
}
