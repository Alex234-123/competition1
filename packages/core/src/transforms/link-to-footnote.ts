/**
 * 外链 → 脚注变换(公众号)。
 *
 * 公众号正文中外链 <a href> 对未认证账号多被屏蔽,业界做法是把外链转成文末脚注
 * (Quaily 模式):正文链接文字后追加上标序号 [n],文末追加脚注块列出 URL。
 */
import type { Block, Inline, ParagraphBlock } from "../ir/types.js";
import type { Transform } from "./pipeline.js";

interface FootnoteAcc {
  readonly footnotes: { id: string; label: string; href: string }[];
}

export const linkToFootnote: Transform = {
  name: "link-to-footnote",
  applicable: (cap) => !cap.supportsExternalLinks,
  run(doc) {
    const acc: FootnoteAcc = { footnotes: [] };
    const blocks = doc.blocks.map((b) => transformBlock(b, acc));
    if (acc.footnotes.length === 0) return doc;

    const footnoteBlocks: Block[] = [
      { type: "divider" },
      ...acc.footnotes.map(
        (f): Block => ({ type: "footnote", id: f.id, label: f.label, href: f.href }),
      ),
    ];
    return { ...doc, blocks: [...blocks, ...footnoteBlocks] };
  },
};

function transformBlock(block: Block, acc: FootnoteAcc): Block {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return { ...block, inlines: transformInlines(block.inlines, acc) } as ParagraphBlock;
    case "quote":
      return { ...block, blocks: block.blocks.map((b) => transformBlock(b, acc)) };
    case "list":
      return { ...block, items: block.items.map((item) => item.map((b) => transformBlock(b, acc))) };
    default:
      return block;
  }
}

function transformInlines(inlines: readonly Inline[], acc: FootnoteAcc): Inline[] {
  const out: Inline[] = [];
  for (const inline of inlines) {
    if (inline.type === "link" && isExternal(inline.href)) {
      const n = acc.footnotes.length + 1;
      const id = `fn-${n}`;
      acc.footnotes.push({ id, label: String(n), href: inline.href });
      // 保留链接文字 + 追加上标序号标记。
      out.push(...inline.children, { type: "text", value: `[${n}]` });
    } else if (inline.type === "strong" || inline.type === "em") {
      out.push({ ...inline, children: transformInlines(inline.children, acc) });
    } else {
      out.push(inline);
    }
  }
  return out;
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** 把脚注 inline 文字工具(供 plaintext 序列化复用)。 */
export function footnoteLabel(href: string, text: string): string {
  return `${text}(${href})`;
}
