/**
 * 表格 → 图片占位变换。
 *
 * B站专栏与小红书对表格支持差或不支持,业界做法是把表格渲染成图片再上传。
 * 核心无渲染能力,因此本变换把 TableBlock 转为一个"待渲染表格图片"的 image 块
 * (资产源用特殊 scheme:table:<json>),由 app 端 Canvas 渲染落地。
 */
import type { Block } from "../ir/types.js";
import { AssetTable, assetTableFrom } from "../assets/asset-table.js";
import { inlinesToPlainText } from "../ir/guards.js";
import type { Transform } from "./pipeline.js";

export const TABLE_ASSET_SCHEME = "table:";

export const tableToImage: Transform = {
  name: "table-to-image",
  applicable: (cap) => !cap.supportsTables,
  run(doc) {
    const hasTable = doc.blocks.some((b) => b.type === "table");
    if (!hasTable) return doc;
    const assets = assetTableFrom(doc.assets);
    const blocks = doc.blocks.map((b) => (b.type === "table" ? toImageBlock(b, assets) : b));
    return { ...doc, blocks, assets: assets.all() };
  },
};

function toImageBlock(table: Extract<Block, { type: "table" }>, assets: AssetTable): Block {
  const grid = {
    header: table.header.map(inlinesToPlainText),
    rows: table.rows.map((row) => row.map(inlinesToPlainText)),
  };
  const dataUrl = TABLE_ASSET_SCHEME + JSON.stringify(grid);
  const id = assets.add("image", { dataUrl, generated: true }, {});
  return { type: "image", assetId: id, alt: "表格", caption: "表格(已转为图片)" };
}

/** 解析 table: 伪 scheme 资产,供 app 端渲染。 */
export function parseTableAsset(dataUrl: string): { header: string[]; rows: string[][] } | undefined {
  if (!dataUrl.startsWith(TABLE_ASSET_SCHEME)) return undefined;
  try {
    return JSON.parse(dataUrl.slice(TABLE_ASSET_SCHEME.length));
  } catch {
    return undefined;
  }
}
