/**
 * 变换注册表 —— 汇总所有降级变换,按平台能力构建有序管线。
 *
 * 加平台无需改这里:新平台只声明 capabilities,管线自动挑选适用变换。
 * 变换顺序很重要:先做内容降级(公式/表格→图片、外链→脚注),再做风格化(违禁词、扁平化)。
 */
import type { Capabilities } from "../ir/types.js";
import type { Transform } from "./pipeline.js";
import { mathToImage } from "./math-to-image.js";
import { tableToImage } from "./table-to-image.js";
import { linkToFootnote } from "./link-to-footnote.js";
import { bannedWordFilter } from "./banned-word-filter.js";
import { flattenToPlaintext } from "./flatten-to-plaintext.js";

/** 全部变换,按应用顺序排列。 */
export const ALL_TRANSFORMS: readonly Transform[] = [
  mathToImage, // 公式 → 图片(知乎)
  tableToImage, // 表格 → 图片(B站/小红书)
  linkToFootnote, // 外链 → 脚注(公众号)
  bannedWordFilter, // 违禁词过滤(小红书)
  flattenToPlaintext, // 纯文本扁平化(小红书,必须最后)
];

/** 据能力构建该平台的变换管线(过滤出 applicable 的变换,保持顺序)。 */
export function buildPipeline(cap: Capabilities): readonly Transform[] {
  return ALL_TRANSFORMS.filter((t) => t.applicable(cap));
}
