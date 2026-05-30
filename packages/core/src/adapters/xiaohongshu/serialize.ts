/**
 * 小红书序列化:IR → 纯文本 + emoji + #话题#。
 *
 * 扁平化已在变换层(flatten-to-plaintext)完成,正文为单一 paragraph 承载多行文本。
 * 本序列化负责:标题硬约束(≤20 字,首图 hook)、正文长度约束(≤1000 字,超出标记溢出)、
 * 话题拼接(#tag# 追加文末,≤10)、保证有封面(必须有图)。
 */
import type { Document, PlatformOverride } from "../../ir/types.js";
import { inlinesToPlainText } from "../../ir/guards.js";
import { graphemeCount, graphemeTruncate } from "../../transforms/grapheme-count.js";
import type { SerializedPayload } from "../types.js";

export function serializeXiaohongshu(doc: Document, override?: PlatformOverride): SerializedPayload {
  // 正文:扁平化变换已把全文塞进第一个 paragraph。
  const bodyRaw = doc.blocks
    .map((b) => (b.type === "paragraph" ? inlinesToPlainText(b.inlines) : ""))
    .filter((s) => s.length > 0)
    .join("\n\n");

  const tags = (override?.tags ?? doc.meta.tags).slice(0, 10);
  const tagLine = tags.map((t) => `#${t}#`).join(" ");

  // 正文 + 话题行,总长 ≤1000;若超出,正文截断并保留话题行。
  const reserve = tagLine ? graphemeCount(tagLine) + 2 : 0;
  const bodyBudget = Math.max(0, 1000 - reserve);
  const bodyCount = graphemeCount(bodyRaw);
  const overflow = bodyCount > bodyBudget;
  const body = overflow ? graphemeTruncate(bodyRaw, bodyBudget) : bodyRaw;
  const content = tagLine ? `${body}\n\n${tagLine}` : body;

  // 标题:≤20 字,优先 override,否则取 meta 标题截断。
  const title = graphemeTruncate(override?.title ?? doc.meta.title, 20);

  return {
    content,
    mime: "text/plain",
    title,
    tags,
    imageAssetIds: collectImages(doc),
    coverAssetId: override?.coverAssetId ?? doc.meta.coverAssetId,
    extra: {
      bodyGraphemeCount: graphemeCount(content),
      overflow,
      overflowHint: overflow ? "正文超 1000 字,溢出部分建议做成图片卡片,而非截断语义。" : undefined,
      needsGeneratedCover: !doc.meta.coverAssetId && collectImages(doc).length === 0,
    },
  };
}

function collectImages(doc: Document): string[] {
  const ids: string[] = [];
  for (const b of doc.blocks) if (b.type === "image") ids.push(b.assetId);
  return ids;
}
