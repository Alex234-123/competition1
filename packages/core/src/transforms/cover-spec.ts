/**
 * 封面布局规格(纯数据)。
 *
 * 核心无渲染能力,只产出"画什么"的规格;app 端 Canvas 据此落地为 PNG。
 * 小红书必须有图,若文档无封面资产则需据此生成一张标题卡作为首图。
 */
import type { Document } from "../ir/types.js";
import { graphemeTruncate } from "./grapheme-count.js";

export type CoverRatio = "3:4" | "1:1" | "4:3" | "2.35:1" | "16:9";

export interface CoverSpec {
  readonly ratio: CoverRatio;
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly subtitle?: string;
  readonly accent: string;
  readonly background: string;
  readonly textColor: string;
}

const RATIO_SIZE: Record<CoverRatio, { width: number; height: number }> = {
  "3:4": { width: 1080, height: 1440 },
  "1:1": { width: 1080, height: 1080 },
  "4:3": { width: 1200, height: 900 },
  "2.35:1": { width: 1080, height: 460 },
  "16:9": { width: 1280, height: 720 },
};

export interface CoverSpecOptions {
  readonly ratio?: CoverRatio;
  readonly accent?: string;
  readonly background?: string;
  readonly textColor?: string;
  /** 标题最大显示字数(默认 24)。 */
  readonly titleMax?: number;
}

/** 据文档生成封面规格。标题取 override 标题或 meta.title。 */
export function buildCoverSpec(doc: Document, options: CoverSpecOptions = {}): CoverSpec {
  const ratio = options.ratio ?? "3:4";
  const size = RATIO_SIZE[ratio];
  const titleMax = options.titleMax ?? 24;
  const title = graphemeTruncate(doc.meta.title || "未命名内容", titleMax);
  return {
    ratio,
    width: size.width,
    height: size.height,
    title,
    subtitle: doc.meta.subtitle,
    accent: options.accent ?? "#FF2442", // 小红书红
    background: options.background ?? "#FFFFFF",
    textColor: options.textColor ?? "#222222",
  };
}
