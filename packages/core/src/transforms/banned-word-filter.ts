/**
 * 违禁词/极限词过滤变换(小红书)。
 *
 * 小红书等平台对"极限词"(最/第一/国家级)、营销违禁词、敏感词敏感,会限流。
 * 本变换检测并把命中词替换为温和表达或加注,同时产出告警(供校验器汇总)。
 * 词表为内置常见样例,实际可由 ctx.bannedWords 覆盖/扩充。
 */
import type { Block, Document, Inline } from "../ir/types.js";
import type { Transform } from "./pipeline.js";

/** 内置极限词/常见违禁词样例(非穷尽,演示用)。 */
export const DEFAULT_BANNED_WORDS: readonly string[] = [
  "最佳",
  "最好",
  "第一",
  "顶级",
  "国家级",
  "世界级",
  "绝无仅有",
  "万能",
  "100%",
  "绝对",
  "永久",
  "根治",
  "包治",
];

/** 命中替换映射(尽量保意)。未列出的命中词用「[违规词]」遮罩。 */
const REPLACEMENTS: Record<string, string> = {
  最佳: "很好",
  最好: "很好",
  第一: "领先",
  顶级: "高端",
  绝对: "确实",
};

export interface BannedWordHit {
  readonly word: string;
  readonly count: number;
}

/** 扫描文档命中的违禁词(供校验器使用,不修改文档)。 */
export function scanBannedWords(doc: Document, words: readonly string[] = DEFAULT_BANNED_WORDS): BannedWordHit[] {
  const text = doc.blocks.map(blockText).join("\n") + "\n" + doc.meta.title;
  const hits: BannedWordHit[] = [];
  for (const w of words) {
    const count = countOccurrences(text, w);
    if (count > 0) hits.push({ word: w, count });
  }
  return hits;
}

export const bannedWordFilter: Transform = {
  name: "banned-word-filter",
  applicable: (cap) => cap.bannedWordFilter,
  run(doc, ctx) {
    const words = ctx.bannedWords ?? DEFAULT_BANNED_WORDS;
    const blocks = doc.blocks.map((b) => transformBlock(b, words));
    const title = replaceAll(doc.meta.title, words);
    return { ...doc, meta: { ...doc.meta, title }, blocks };
  },
};

function transformBlock(block: Block, words: readonly string[]): Block {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return { ...block, inlines: block.inlines.map((i) => transformInline(i, words)) };
    case "quote":
      return { ...block, blocks: block.blocks.map((b) => transformBlock(b, words)) };
    case "list":
      return { ...block, items: block.items.map((item) => item.map((b) => transformBlock(b, words))) };
    default:
      return block;
  }
}

function transformInline(inline: Inline, words: readonly string[]): Inline {
  if (inline.type === "text") return { type: "text", value: replaceAll(inline.value, words) };
  if (inline.type === "strong" || inline.type === "em") {
    return { ...inline, children: inline.children.map((i) => transformInline(i, words)) };
  }
  if (inline.type === "link") {
    return { ...inline, children: inline.children.map((i) => transformInline(i, words)) };
  }
  return inline;
}

function replaceAll(text: string, words: readonly string[]): string {
  let out = text;
  for (const w of words) {
    if (!out.includes(w)) continue;
    const replacement = REPLACEMENTS[w] ?? "✦";
    out = out.split(w).join(replacement);
  }
  return out;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

function blockText(block: Block): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return inlineText(block.inlines);
    case "quote":
      return block.blocks.map(blockText).join(" ");
    case "list":
      return block.items.map((item) => item.map(blockText).join(" ")).join(" ");
    case "codeBlock":
      return block.text;
    default:
      return "";
  }
}

function inlineText(inlines: readonly Inline[]): string {
  return inlines
    .map((i) => {
      if (i.type === "text" || i.type === "code" || i.type === "emoji") return i.value;
      if (i.type === "strong" || i.type === "em" || i.type === "link") return inlineText(i.children);
      return "";
    })
    .join("");
}
