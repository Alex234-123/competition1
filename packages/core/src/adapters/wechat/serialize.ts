/** 公众号序列化:IR → 全内联样式 HTML。 */
import type { Asset, Document, PlatformOverride } from "../../ir/types.js";
import { blockToPlainText } from "../../ir/guards.js";
import { graphemeTruncate } from "../../transforms/grapheme-count.js";
import type { SerializedPayload } from "../types.js";
import { buildAssetMap, renderDocumentHtml, type HtmlStyleStrategy } from "../shared/html-render.js";
import { createMinimalTheme, wrapWechatContainer } from "./theme.js";

const WECHAT = "wechat";

export function serializeWechat(doc: Document, override?: PlatformOverride): SerializedPayload {
  const theme = createMinimalTheme();
  const assetMap = buildAssetMap(doc);

  const strategy: HtmlStyleStrategy = {
    platformId: WECHAT,
    emitClass: false, // 公众号 class 无意义
    style: (tag) => theme.styleFor(tag),
    resolveImageSrc: (asset: Asset | undefined) => {
      // 优先取公众号重托管 URL(media/uploadimg 返回的 mp 域名);否则保留原始 URL(预览用)。
      const rehosted = asset?.rehosted[WECHAT]?.url;
      return rehosted ?? asset?.source.url ?? asset?.source.dataUrl ?? "";
    },
  };

  const inner = renderDocumentHtml(doc, strategy, assetMap);
  const content = wrapWechatContainer(inner);

  const title = graphemeTruncate(override?.title ?? doc.meta.title, 64);
  const summary = graphemeTruncate(deriveSummary(doc, override), 120);
  const tags = (override?.tags ?? doc.meta.tags).slice(0, 5);

  return {
    content,
    mime: "text/html",
    title,
    summary,
    tags,
    imageAssetIds: collectImages(doc),
    coverAssetId: override?.coverAssetId ?? doc.meta.coverAssetId,
    extra: {
      author: graphemeTruncate(doc.meta.authorName ?? "", 8),
      contentSourceUrl: doc.meta.canonicalUrl,
      themeId: theme.id,
    },
  };
}

function deriveSummary(doc: Document, override?: PlatformOverride): string {
  if (override?.summary) return override.summary;
  if (doc.meta.summary) return doc.meta.summary;
  // 默认取正文前 ~64 字。
  const firstText = doc.blocks.map(blockToPlainText).find((t) => t.trim().length > 0) ?? "";
  return firstText.slice(0, 120);
}

function collectImages(doc: Document): string[] {
  const ids: string[] = [];
  for (const b of doc.blocks) if (b.type === "image") ids.push(b.assetId);
  return ids;
}
