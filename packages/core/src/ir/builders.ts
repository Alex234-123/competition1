/** IR 节点工厂 —— 集中构造,避免散落的对象字面量,便于测试与重构。 */
import type {
  Asset,
  Block,
  Document,
  DocumentMeta,
  HeadingBlock,
  Inline,
  ParagraphBlock,
  TextInline,
} from "./types.js";

export function text(value: string): TextInline {
  return { type: "text", value };
}

export function paragraph(inlines: readonly Inline[]): ParagraphBlock {
  return { type: "paragraph", inlines };
}

export function heading(level: HeadingBlock["level"], inlines: readonly Inline[]): HeadingBlock {
  return { type: "heading", level, inlines };
}

export interface DocumentInit {
  readonly meta?: Partial<DocumentMeta>;
  readonly blocks?: readonly Block[];
  readonly assets?: readonly Asset[];
  readonly overrides?: Document["overrides"];
}

const DEFAULT_META: DocumentMeta = {
  title: "",
  tags: [],
  lang: "zh",
};

/** 构造文档,缺省字段补默认值(meta 必有 title/tags/lang)。 */
export function createDocument(init: DocumentInit = {}): Document {
  return {
    meta: { ...DEFAULT_META, ...init.meta },
    blocks: init.blocks ?? [],
    assets: init.assets ?? [],
    overrides: init.overrides ?? {},
  };
}
