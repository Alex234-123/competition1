/** IR 类型守卫 —— 用于在变换与序列化中对 Block/Inline 做窄化。 */
import type {
  Block,
  CodeBlock,
  DividerBlock,
  EmbedBlock,
  FootnoteBlock,
  HeadingBlock,
  ImageBlock,
  Inline,
  LinkInline,
  ListBlock,
  MathBlock,
  ParagraphBlock,
  QuoteBlock,
  TableBlock,
} from "./types.js";

export const isHeading = (b: Block): b is HeadingBlock => b.type === "heading";
export const isParagraph = (b: Block): b is ParagraphBlock => b.type === "paragraph";
export const isList = (b: Block): b is ListBlock => b.type === "list";
export const isQuote = (b: Block): b is QuoteBlock => b.type === "quote";
export const isCodeBlock = (b: Block): b is CodeBlock => b.type === "codeBlock";
export const isImage = (b: Block): b is ImageBlock => b.type === "image";
export const isTable = (b: Block): b is TableBlock => b.type === "table";
export const isMath = (b: Block): b is MathBlock => b.type === "math";
export const isDivider = (b: Block): b is DividerBlock => b.type === "divider";
export const isEmbed = (b: Block): b is EmbedBlock => b.type === "embed";
export const isFootnote = (b: Block): b is FootnoteBlock => b.type === "footnote";

export const isLink = (i: Inline): i is LinkInline => i.type === "link";

/** 提取一组 inline 的纯文本(用于标题计数、摘要派生、纯文本序列化)。 */
export function inlinesToPlainText(inlines: readonly Inline[]): string {
  let out = "";
  for (const inline of inlines) {
    switch (inline.type) {
      case "text":
      case "code":
      case "emoji":
        out += inline.value;
        break;
      case "strong":
      case "em":
        out += inlinesToPlainText(inline.children);
        break;
      case "link":
        out += inlinesToPlainText(inline.children);
        break;
      case "inlineMath":
        out += inline.tex;
        break;
      case "lineBreak":
        out += "\n";
        break;
    }
  }
  return out;
}

/** 提取一个块的纯文本(粗略,用于摘要/计数)。 */
export function blockToPlainText(block: Block): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return inlinesToPlainText(block.inlines);
    case "list":
      return block.items.map((item) => item.map(blockToPlainText).join(" ")).join("\n");
    case "quote":
      return block.blocks.map(blockToPlainText).join("\n");
    case "codeBlock":
      return block.text;
    case "image":
      return block.caption ?? block.alt ?? "";
    case "table":
      return [block.header, ...block.rows]
        .map((row) => row.map(inlinesToPlainText).join(" "))
        .join("\n");
    case "math":
      return block.tex;
    case "divider":
    case "embed":
    case "footnote":
      return "";
  }
}
