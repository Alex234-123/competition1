/**
 * 校验器 —— 汇总规则,对单平台产出 ValidationReport。
 *
 * 输入:原始文档(违禁词扫描)+ 序列化产物 + 能力声明。
 * 这是能力驱动的:规则按 capabilities 自动启用,加平台无需改这里。
 */
import type { Capabilities, Document } from "../ir/types.js";
import type { SerializedPayload } from "../adapters/types.js";
import { resolveConfig, type PlatformConfig } from "../config/platform-config.js";
import { buildReport, type ValidationReport } from "./types.js";
import {
  checkBannedWords,
  checkBody,
  checkImageRehost,
  checkMedia,
  checkSummary,
  checkTags,
  checkTitle,
} from "./rules.js";

export function validate(
  platformId: string,
  doc: Document,
  payload: SerializedPayload,
  cap: Capabilities,
  /** 原始文档(变换前)。违禁词扫描基于它,以告知"检测到并已替换";缺省用 doc。 */
  rawDoc?: Document,
  /** 平台运行时配置(违禁词表/上限覆盖)。缺省回退内置默认。 */
  config?: PlatformConfig,
): ValidationReport {
  const resolved = resolveConfig(cap.limits, config);
  const issues = [
    ...checkTitle(payload, resolved.limits),
    ...checkBody(payload, resolved.limits),
    ...checkSummary(payload, resolved.limits),
    ...checkMedia(payload, cap),
    ...checkTags(payload, resolved.limits),
    ...checkBannedWords(rawDoc ?? doc, cap, resolved.bannedWords),
    ...checkImageRehost(doc, platformId, cap),
  ];
  return buildReport(platformId, issues);
}
