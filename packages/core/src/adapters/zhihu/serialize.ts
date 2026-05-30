/**
 * 知乎序列化:IR → 可粘贴富文本 HTML。
 *
 * 走"复制富文本粘贴"路径:输出带轻量标签的 HTML,知乎粘贴处理器会转成内部格式并重传图片。
 * 公式已在变换层转为 equation 图片;表格输出标准 HTML table(知乎导入不支持 MD 表格)。
 * 话题映射:自由标签 → ≤3 个知乎话题(此处仅截断,真实实体匹配需 UI 自动补全确认)。
 */
import type { Asset, Document, PlatformOverride } from "../../ir/types.js";
import { blockToPlainText } from "../../ir/guards.js";
import { graphemeTruncate } from "../../transforms/grapheme-count.js";
import type { SerializedPayload } from "../types.js";
import { buildAssetMap, renderDocumentHtml, type HtmlStyleStrategy } from "../shared/html-render.js";

const ZHIHU = "zhihu";

export function serializeZhihu(doc: Document, override?: PlatformOverride): SerializedPayload {
  const assetMap = buildAssetMap(doc);

  const strategy: HtmlStyleStrategy = {
    platformId: ZHIHU,
    emitClass: true,
    style: () => "", // 知乎用自己的样式体系,输出语义标签即可
    resolveImageSrc: (asset: Asset | undefined) => {
      // 知乎导入需公网可达 URL;粘贴路径下保留原始 URL,知乎会重传。
      return asset?.source.url ?? asset?.rehosted[ZHIHU]?.url ?? asset?.source.dataUrl ?? "";
    },
  };

  const content = renderDocumentHtml(doc, strategy, assetMap);
  const title = graphemeTruncate(override?.title ?? doc.meta.title, 50);
  const summary = override?.summary ?? doc.meta.summary ?? deriveSummary(doc);
  // 知乎话题为实体,≤3。
  const tags = (override?.tags ?? doc.meta.tags).slice(0, 3);

  return {
    content,
    mime: "text/html",
    title,
    summary,
    tags,
    imageAssetIds: collectImages(doc),
    coverAssetId: override?.coverAssetId ?? doc.meta.coverAssetId,
    extra: {
      note: "走复制富文本→粘贴到知乎写文章编辑器;话题需在发布对话框确认为知乎实体话题(≤3)。",
    },
  };
}

function deriveSummary(doc: Document): string {
  const firstText = doc.blocks.map(blockToPlainText).find((t) => t.trim().length > 0) ?? "";
  return firstText.slice(0, 120);
}

function collectImages(doc: Document): string[] {
  const ids: string[] = [];
  for (const b of doc.blocks) if (b.type === "image") ids.push(b.assetId);
  return ids;
}
