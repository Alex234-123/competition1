/**
 * markdown-it token 流 → IR Document。
 *
 * 设计:核心持有语义化 AST,绝不持有平台 HTML。图片登记到资产表并以 assetId 引用。
 * 数学公式($...$ / $$...$$)自行识别为 InlineMath / MathBlock。
 */
import type Token from "markdown-it/lib/token.mjs";
import { createMarkdownParser } from "./markdown.js";
import { AssetTable } from "../assets/asset-table.js";
import { inlinesToPlainText } from "../ir/guards.js";
import { createDocument } from "../ir/builders.js";
import type {
  Block,
  Document,
  DocumentMeta,
  HeadingBlock,
  Inline,
} from "../ir/types.js";

export interface ParseOptions {
  /** 覆盖/补充元数据(优先级高于从正文 H1 提取的 title)。 */
  readonly meta?: Partial<DocumentMeta>;
  /** 是否把正文首个 H1 提取为标题并从正文移除(默认 true)。 */
  readonly liftFirstHeading?: boolean;
}

export interface ParseResult {
  readonly document: Document;
  readonly assetTable: AssetTable;
}

class Cursor {
  pos = 0;
  constructor(readonly tokens: readonly Token[]) {}
  peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  next(): Token {
    return this.tokens[this.pos++]!;
  }
  eof(): boolean {
    return this.pos >= this.tokens.length;
  }
}

/** 解析 Markdown 字符串为 IR。 */
export function markdownToIR(markdown: string, options: ParseOptions = {}): ParseResult {
  const md = createMarkdownParser();
  const tokens = md.parse(markdown, {});
  const assetTable = new AssetTable();

  const blocks = parseBlocks(new Cursor(tokens), assetTable);

  // 提取首个 H1 作为标题。
  let bodyBlocks = blocks;
  let extractedTitle = "";
  const liftHeading = options.liftFirstHeading ?? true;
  if (liftHeading && blocks.length > 0 && blocks[0]!.type === "heading" && (blocks[0] as HeadingBlock).level === 1) {
    extractedTitle = inlinesToPlainText((blocks[0] as HeadingBlock).inlines);
    bodyBlocks = blocks.slice(1);
  }

  const meta: DocumentMeta = {
    title: options.meta?.title ?? extractedTitle,
    subtitle: options.meta?.subtitle,
    authorName: options.meta?.authorName,
    summary: options.meta?.summary,
    coverAssetId: options.meta?.coverAssetId,
    tags: options.meta?.tags ?? [],
    topics: options.meta?.topics,
    canonicalUrl: options.meta?.canonicalUrl,
    lang: options.meta?.lang ?? "zh",
  };

  const document = createDocument({ meta, blocks: bodyBlocks, assets: assetTable.all() });
  return { document, assetTable };
}

// ---------------------------------------------------------------------------
// 块级解析
// ---------------------------------------------------------------------------

function parseBlocks(cursor: Cursor, assets: AssetTable, stopType?: string): Block[] {
  const blocks: Block[] = [];
  while (!cursor.eof()) {
    const tok = cursor.peek()!;
    if (stopType && tok.type === stopType) break;

    switch (tok.type) {
      case "heading_open":
        blocks.push(parseHeading(cursor));
        break;
      case "paragraph_open":
        blocks.push(...parseParagraph(cursor, assets));
        break;
      case "bullet_list_open":
      case "ordered_list_open":
        blocks.push(parseList(cursor, assets));
        break;
      case "blockquote_open":
        blocks.push(parseQuote(cursor, assets));
        break;
      case "fence":
      case "code_block":
        blocks.push({ type: "codeBlock", lang: tok.info.trim() || undefined, text: tok.content.replace(/\n$/, "") });
        cursor.next();
        break;
      case "hr":
        cursor.next();
        blocks.push({ type: "divider" });
        break;
      case "table_open":
        blocks.push(parseTable(cursor));
        break;
      default:
        cursor.next();
        break;
    }
  }
  return blocks;
}

function parseHeading(cursor: Cursor): HeadingBlock {
  const open = cursor.next(); // heading_open
  const level = Number(open.tag.slice(1)) as HeadingBlock["level"];
  const inlineTok = cursor.next(); // inline
  const inlines = parseInlines(inlineTok.children ?? []);
  cursor.next(); // heading_close
  return { type: "heading", level, inlines };
}

/** 解析段落;若纯为块公式或图片则提升为对应块,混合图片则拆出。 */
function parseParagraph(cursor: Cursor, assets: AssetTable): Block[] {
  cursor.next(); // paragraph_open
  const inlineTok = cursor.next(); // inline
  cursor.next(); // paragraph_close

  const raw = inlineTok.content.trim();
  const blockMath = /^\$\$([\s\S]+?)\$\$$/.exec(raw);
  if (blockMath) {
    return [{ type: "math", tex: blockMath[1]!.trim() }];
  }

  const { inlines, images } = parseInlinesWithImages(inlineTok.children ?? [], assets);
  const out: Block[] = [];
  const hasText = inlines.some((i) => !(i.type === "text" && i.value.trim() === ""));
  if (hasText) out.push({ type: "paragraph", inlines });
  out.push(...images);
  return out.length > 0 ? out : [{ type: "paragraph", inlines: [] }];
}

function parseList(cursor: Cursor, assets: AssetTable): Block {
  const open = cursor.next(); // list_open
  const ordered = open.type === "ordered_list_open";
  const items: Block[][] = [];
  while (!cursor.eof() && cursor.peek()!.type !== `${ordered ? "ordered" : "bullet"}_list_close`) {
    if (cursor.peek()!.type === "list_item_open") {
      cursor.next(); // list_item_open
      const itemBlocks = parseBlocks(cursor, assets, "list_item_close");
      cursor.next(); // list_item_close
      items.push(itemBlocks);
    } else {
      cursor.next();
    }
  }
  cursor.next(); // list_close
  return { type: "list", ordered, items };
}

function parseQuote(cursor: Cursor, assets: AssetTable): Block {
  cursor.next(); // blockquote_open
  const inner = parseBlocks(cursor, assets, "blockquote_close");
  cursor.next(); // blockquote_close
  return { type: "quote", blocks: inner };
}

function parseTable(cursor: Cursor): Block {
  cursor.next(); // table_open
  const header: Inline[][] = [];
  const rows: Inline[][][] = [];
  let inHead = false;
  let currentRow: Inline[][] = [];

  while (!cursor.eof() && cursor.peek()!.type !== "table_close") {
    const tok = cursor.next();
    switch (tok.type) {
      case "thead_open":
        inHead = true;
        break;
      case "thead_close":
        inHead = false;
        break;
      case "tr_open":
        currentRow = [];
        break;
      case "tr_close":
        // 表头单元格在 th_open 分支已直接填入 header;此处仅收集正文行。
        if (!inHead) rows.push(currentRow);
        break;
      case "th_open":
      case "td_open": {
        const inlineTok = cursor.next(); // inline
        const cell = parseInlines(inlineTok.children ?? []);
        cursor.next(); // th_close / td_close
        if (inHead) header.push(cell);
        else currentRow.push(cell);
        break;
      }
      default:
        break;
    }
  }
  cursor.next(); // table_close
  return { type: "table", header, rows };
}

// ---------------------------------------------------------------------------
// 行内解析
// ---------------------------------------------------------------------------

function parseInlines(children: readonly Token[]): Inline[] {
  const cursor = new Cursor(children);
  return parseInlineSeq(cursor);
}

/** 解析行内并把图片拆为单独 ImageBlock(段落内图片提升)。 */
function parseInlinesWithImages(
  children: readonly Token[],
  assets: AssetTable,
): { inlines: Inline[]; images: Block[] } {
  const images: Block[] = [];
  const cursor = new Cursor(children);
  const inlines = parseInlineSeq(cursor, (tok) => {
    if (tok.type === "image") {
      const src = tok.attrGet("src") ?? "";
      const alt = tok.content || tok.attrGet("alt") || undefined;
      const id = assets.add("image", { url: src }, {});
      images.push({ type: "image", assetId: id, alt });
      return true; // consumed
    }
    return false;
  });
  return { inlines, images };
}

function parseInlineSeq(
  cursor: Cursor,
  onImage?: (tok: Token) => boolean,
  stopType?: string,
): Inline[] {
  const out: Inline[] = [];
  while (!cursor.eof()) {
    const tok = cursor.peek()!;
    if (stopType && tok.type === stopType) break;

    switch (tok.type) {
      case "text":
        cursor.next();
        out.push(...splitInlineMath(tok.content));
        break;
      case "strong_open": {
        cursor.next();
        const children = parseInlineSeq(cursor, onImage, "strong_close");
        cursor.next();
        out.push({ type: "strong", children });
        break;
      }
      case "em_open": {
        cursor.next();
        const children = parseInlineSeq(cursor, onImage, "em_close");
        cursor.next();
        out.push({ type: "em", children });
        break;
      }
      case "link_open": {
        const href = tok.attrGet("href") ?? "";
        cursor.next();
        const children = parseInlineSeq(cursor, onImage, "link_close");
        cursor.next();
        out.push({ type: "link", href, children });
        break;
      }
      case "code_inline":
        cursor.next();
        out.push({ type: "code", value: tok.content });
        break;
      case "image":
        if (onImage && onImage(tok)) {
          cursor.next();
        } else {
          cursor.next();
          out.push({ type: "text", value: tok.content || "" });
        }
        break;
      case "softbreak":
      case "hardbreak":
        cursor.next();
        out.push({ type: "lineBreak" });
        break;
      default:
        cursor.next();
        break;
    }
  }
  return out;
}

/** 把含 $...$ / $$...$$ 的文本拆为 text + inlineMath。要求公式不以空白开头/结尾以避免误判价格符号。 */
export function splitInlineMath(value: string): Inline[] {
  const re = /\$\$(?!\s)([^$]+?)(?<!\s)\$\$|\$(?!\s)([^$\n]+?)(?<!\s)\$/g;
  const out: Inline[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    if (m.index > last) out.push({ type: "text", value: value.slice(last, m.index) });
    const tex = (m[1] ?? m[2] ?? "").trim();
    out.push({ type: "inlineMath", tex });
    last = re.lastIndex;
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out.length > 0 ? out : [{ type: "text", value }];
}
