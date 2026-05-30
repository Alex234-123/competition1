/**
 * 共享 HTML 序列化工具 —— 公众号/知乎/B站均产出 HTML,但样式策略不同。
 *
 * 提供一个可配置的 IR→HTML 渲染器:调用方传入"每种块/行内如何包裹"的样式策略,
 * 渲染器负责遍历 IR、转义文本、解析图片 URL。公众号走全内联样式,知乎/B站走标签+轻样式。
 */
import type { Asset, Block, Document, Inline } from "../../ir/types.js";

export interface HtmlStyleStrategy {
  /** 各块的内联 style(公众号用),不需要则返回空串。 */
  readonly style: (tag: string) => string;
  /** 图片如何解析 src:优先取平台重托管结果,否则原始 URL。 */
  readonly resolveImageSrc: (asset: Asset | undefined, platformId: string) => string;
  readonly platformId: string;
  /** 是否输出 class(知乎/B站可用,公众号无意义)。 */
  readonly emitClass?: boolean;
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ESC[c]!);
}

function styleAttr(s: string): string {
  return s ? ` style="${s}"` : "";
}
function classAttr(strategy: HtmlStyleStrategy, name: string): string {
  return strategy.emitClass ? ` class="mpp-${name}"` : "";
}

export function renderDocumentHtml(
  doc: Document,
  strategy: HtmlStyleStrategy,
  assetMap: ReadonlyMap<string, Asset>,
): string {
  return doc.blocks.map((b) => renderBlock(b, strategy, assetMap)).join("\n");
}

function renderBlock(block: Block, st: HtmlStyleStrategy, assets: ReadonlyMap<string, Asset>): string {
  switch (block.type) {
    case "heading": {
      const tag = `h${block.level}`;
      return `<${tag}${styleAttr(st.style(tag))}${classAttr(st, tag)}>${renderInlines(block.inlines, st)}</${tag}>`;
    }
    case "paragraph":
      return `<p${styleAttr(st.style("p"))}${classAttr(st, "p")}>${renderInlines(block.inlines, st)}</p>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      const items = block.items
        .map((item) => `<li${styleAttr(st.style("li"))}>${item.map((b) => renderBlock(b, st, assets)).join("")}</li>`)
        .join("");
      return `<${tag}${styleAttr(st.style(tag))}${classAttr(st, tag)}>${items}</${tag}>`;
    }
    case "quote":
      return `<blockquote${styleAttr(st.style("blockquote"))}${classAttr(st, "blockquote")}>${block.blocks
        .map((b) => renderBlock(b, st, assets))
        .join("")}</blockquote>`;
    case "codeBlock":
      return `<pre${styleAttr(st.style("pre"))}${classAttr(st, "pre")}><code>${escapeHtml(block.text)}</code></pre>`;
    case "image": {
      const asset = assets.get(block.assetId);
      const src = st.resolveImageSrc(asset, st.platformId);
      const alt = escapeHtml(block.alt ?? "");
      const img = `<img src="${escapeHtml(src)}" alt="${alt}"${styleAttr(st.style("img"))} />`;
      if (block.caption) {
        return `<figure${styleAttr(st.style("figure"))}>${img}<figcaption${styleAttr(
          st.style("figcaption"),
        )}>${escapeHtml(block.caption)}</figcaption></figure>`;
      }
      return img;
    }
    case "table":
      return renderTable(block, st);
    case "math":
      return `<p${styleAttr(st.style("p"))}>${escapeHtml(block.tex)}</p>`;
    case "divider":
      return `<hr${styleAttr(st.style("hr"))} />`;
    case "embed":
      return block.src ? `<p${styleAttr(st.style("p"))}>${escapeHtml(block.src)}</p>` : "";
    case "footnote":
      return `<p${styleAttr(st.style("footnote"))}${classAttr(st, "footnote")}>[${escapeHtml(
        block.label,
      )}] ${escapeHtml(block.href)}</p>`;
  }
}

function renderTable(block: Extract<Block, { type: "table" }>, st: HtmlStyleStrategy): string {
  const head = `<thead><tr>${block.header
    .map((cell) => `<th${styleAttr(st.style("th"))}>${renderInlines(cell, st)}</th>`)
    .join("")}</tr></thead>`;
  const body = `<tbody>${block.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td${styleAttr(st.style("td"))}>${renderInlines(cell, st)}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody>`;
  return `<table${styleAttr(st.style("table"))}${classAttr(st, "table")}>${head}${body}</table>`;
}

export function renderInlines(inlines: readonly Inline[], st: HtmlStyleStrategy): string {
  return inlines
    .map((i) => {
      switch (i.type) {
        case "text":
          return escapeHtml(i.value);
        case "emoji":
          return escapeHtml(i.value);
        case "strong":
          return `<strong${styleAttr(st.style("strong"))}>${renderInlines(i.children, st)}</strong>`;
        case "em":
          return `<em${styleAttr(st.style("em"))}>${renderInlines(i.children, st)}</em>`;
        case "code":
          return `<code${styleAttr(st.style("codeInline"))}>${escapeHtml(i.value)}</code>`;
        case "link":
          return `<a href="${escapeHtml(i.href)}"${styleAttr(st.style("a"))}>${renderInlines(i.children, st)}</a>`;
        case "inlineMath":
          return escapeHtml(i.tex);
        case "lineBreak":
          return "<br />";
      }
    })
    .join("");
}

/** 从文档资产数组构建 id→Asset 映射。 */
export function buildAssetMap(doc: Document): Map<string, Asset> {
  return new Map(doc.assets.map((a) => [a.id, a]));
}
