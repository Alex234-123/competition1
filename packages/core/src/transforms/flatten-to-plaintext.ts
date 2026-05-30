/**
 * IR → 伪排版纯文本(小红书)。
 *
 * 小红书正文是纯文本,无 Markdown/HTML。"排版"靠:emoji 起头、空行分段、符号列表。
 * 本变换把 IR 块转成符合小红书风格的纯文本行,并把标题转成 emoji 引导行、列表转符号行。
 * 输出仍是 Document(单一 paragraph 承载多行文本),便于后续校验与序列化统一处理。
 */
import type { Block, Inline } from "../ir/types.js";
import { inlinesToPlainText } from "../ir/guards.js";
import type { Transform } from "./pipeline.js";

/** 标题层级 → 引导 emoji。 */
const HEADING_EMOJI = ["📌", "✨", "🔸", "▫️", "·", "·"];
/** 有序列表数字 emoji。 */
const NUMBER_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export const flattenToPlaintext: Transform = {
  name: "flatten-to-plaintext",
  applicable: (cap) => cap.contentModel === "plaintext",
  run(doc) {
    const lines: string[] = [];
    const images: Block[] = [];
    for (const block of doc.blocks) {
      // 图片块单独保留(小红书图文笔记需要图片资产),不并入文本流。
      if (block.type === "image") {
        images.push(block);
        if (block.caption) lines.push(`🖼 ${block.caption}`, "");
        continue;
      }
      const rendered = renderBlock(block);
      if (rendered.length > 0) {
        lines.push(...rendered, ""); // 块之间空行
      }
    }
    // 去除末尾多余空行。
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

    const body = lines.join("\n");
    return {
      ...doc,
      // 文本合成单一 paragraph,图片块保留在其后供序列化收集。
      blocks: [{ type: "paragraph", inlines: [{ type: "text", value: body }] }, ...images],
    };
  },
};

function renderBlock(block: Block): string[] {
  switch (block.type) {
    case "heading": {
      const emoji = HEADING_EMOJI[block.level - 1] ?? "🔸";
      return [`${emoji} ${inlinesToPlainText(block.inlines)}`];
    }
    case "paragraph": {
      const text = renderInlines(block.inlines).trim();
      return text ? [text] : [];
    }
    case "list":
      return block.items.flatMap((item, idx) => {
        const prefix = block.ordered ? (NUMBER_EMOJI[idx] ?? `${idx + 1}.`) : "✅";
        const itemText = item.map(renderBlock).flat().join(" ");
        return [`${prefix} ${itemText}`];
      });
    case "quote":
      return block.blocks.flatMap(renderBlock).map((line) => `💬 ${line}`);
    case "codeBlock":
      return [`〖代码〗`, block.text];
    case "image":
      return block.caption ? [`🖼 ${block.caption}`] : [];
    case "divider":
      return ["— — — — —"];
    case "math":
      return [`🔢 ${block.tex}`];
    case "footnote":
      return [`🔗 ${block.label}: ${block.href}`];
    default:
      return [];
  }
}

/** 行内渲染:去除强调/代码标记(纯文本无样式),链接保留文字。 */
function renderInlines(inlines: readonly Inline[]): string {
  return inlines
    .map((i) => {
      switch (i.type) {
        case "text":
        case "code":
        case "emoji":
          return i.value;
        case "strong":
        case "em":
        case "link":
          return renderInlines(i.children);
        case "inlineMath":
          return i.tex;
        case "lineBreak":
          return "\n";
      }
    })
    .join("");
}
