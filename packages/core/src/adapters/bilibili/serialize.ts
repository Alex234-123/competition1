/**
 * B站专栏序列化:IR → 受限 HTML 子集。
 *
 * 表格已在变换层转图片;此处输出标签 + 轻量 class(B站用 class+内联样式做装饰)。
 * 图片需重托管到 hdslb(防盗链),序列化优先取重托管 URL。
 * 派生:category/tid(由 override.category 或标签首项映射)、tags(≤10)、words(字数)。
 */
import type { Asset, Document, PlatformOverride } from "../../ir/types.js";
import { blockToPlainText } from "../../ir/guards.js";
import { graphemeCount, graphemeTruncate } from "../../transforms/grapheme-count.js";
import type { SerializedPayload } from "../types.js";
import { buildAssetMap, renderDocumentHtml, type HtmlStyleStrategy } from "../shared/html-render.js";

const BILIBILI = "bilibili";

/** 标签 → B站分区(tid)的粗映射(演示用,真实需完整分区表)。 */
const PARTITION_MAP: Record<string, { category: string; tid: number }> = {
  科技: { category: "科技", tid: 201 },
  技术: { category: "科技", tid: 201 },
  编程: { category: "科技", tid: 201 },
  游戏: { category: "游戏", tid: 4 },
  生活: { category: "生活", tid: 160 },
  动画: { category: "动画", tid: 1 },
  影视: { category: "影视", tid: 181 },
};

export function serializeBilibili(doc: Document, override?: PlatformOverride): SerializedPayload {
  const assetMap = buildAssetMap(doc);

  const strategy: HtmlStyleStrategy = {
    platformId: BILIBILI,
    emitClass: true,
    style: () => "",
    resolveImageSrc: (asset: Asset | undefined) => {
      // 防盗链:必须 hdslb URL;预览阶段回退原始 URL。
      return asset?.rehosted[BILIBILI]?.url ?? asset?.source.url ?? asset?.source.dataUrl ?? "";
    },
  };

  const content = renderDocumentHtml(doc, strategy, assetMap);
  const title = graphemeTruncate(override?.title ?? doc.meta.title, 40);
  const tags = (override?.tags ?? doc.meta.tags).slice(0, 10);
  const summary = override?.summary ?? doc.meta.summary ?? deriveSummary(doc);
  const partition = resolvePartition(override, doc.meta.tags);
  const words = graphemeCount(doc.blocks.map(blockToPlainText).join(""));

  return {
    content,
    mime: "text/html",
    title,
    summary,
    tags,
    imageAssetIds: collectImages(doc),
    coverAssetId: override?.coverAssetId ?? doc.meta.coverAssetId,
    extra: {
      category: partition.category,
      tid: partition.tid,
      words,
      note: "代码/表格已转图片;图片需重托管到 hdslb;头图≥640px(~3:2)对分发关键。",
    },
  };
}

function resolvePartition(override: PlatformOverride | undefined, tags: readonly string[]): { category: string; tid: number } {
  if (override?.category && PARTITION_MAP[override.category]) return PARTITION_MAP[override.category]!;
  for (const tag of tags) if (PARTITION_MAP[tag]) return PARTITION_MAP[tag]!;
  return { category: "科技", tid: 201 }; // 默认分区
}

function deriveSummary(doc: Document): string {
  const firstText = doc.blocks.map(blockToPlainText).find((t) => t.trim().length > 0) ?? "";
  return firstText.slice(0, 80);
}

function collectImages(doc: Document): string[] {
  const ids: string[] = [];
  for (const b of doc.blocks) if (b.type === "image") ids.push(b.assetId);
  return ids;
}
