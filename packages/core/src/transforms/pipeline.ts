/**
 * 能力驱动降级变换 —— 类型与管线编排。
 *
 * 核心思想:变换是纯函数 (Document, ctx) => Document。适配器只声明 capabilities,
 * 管线据此从注册表挑出需要的变换并按序应用。加平台只需声明能力,变换库零改动。
 */
import type { Capabilities, Document } from "../ir/types.js";

export interface TransformContext {
  readonly platformId: string;
  readonly capabilities: Capabilities;
  /** 违禁词表(仅 bannedWordFilter 平台使用)。 */
  readonly bannedWords?: readonly string[];
}

export interface Transform {
  readonly name: string;
  /** 给定能力是否启用该变换。 */
  readonly applicable: (cap: Capabilities) => boolean;
  readonly run: (doc: Document, ctx: TransformContext) => Document;
}

/** 顺序应用一组变换。 */
export function runPipeline(
  transforms: readonly Transform[],
  doc: Document,
  ctx: TransformContext,
): Document {
  return transforms.reduce((acc, t) => (t.applicable(ctx.capabilities) ? t.run(acc, ctx) : acc), doc);
}
