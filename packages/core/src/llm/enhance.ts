/**
 * LLM 字段级增强 —— 在序列化产物上做"风格改写",规则做不好的部分由 LLM 补足。
 *
 * 策略(保守、不破坏结构):
 *   - title:按平台上限优化标题(爆款钩子);改后用 graphemeTruncate 复检长度。
 *   - summary:无摘要时生成;有则可优化。
 *   - 正文口语化:仅对 plaintext 平台(小红书)做整体口语化,HTML 平台不动正文结构。
 * 任一步失败/不可用都回退原值,保证发布链路不被 LLM 拖垮。
 */
import type { Capabilities } from "../ir/types.js";
import type { SerializedPayload } from "../adapters/types.js";
import { graphemeTruncate } from "../transforms/grapheme-count.js";
import type { LlmAdapter } from "./types.js";

export interface EnhanceOptions {
  /** 是否优化标题。 */
  readonly title?: boolean;
  /** 是否生成/优化摘要。 */
  readonly summary?: boolean;
  /** 是否口语化正文(仅对 plaintext 平台生效)。 */
  readonly colloquialize?: boolean;
}

/**
 * 用 LLM 增强序列化产物的指定字段。
 *
 * @param platformId 平台 id
 * @param payload 序列化产物
 * @param cap 平台能力(取上限做复检 + 判断是否 plaintext)
 * @param llm LLM 适配器(不可用则原样返回)
 * @param opts 启用哪些增强
 */
export async function enhancePayload(
  platformId: string,
  payload: SerializedPayload,
  cap: Capabilities,
  llm: LlmAdapter,
  opts: EnhanceOptions,
): Promise<SerializedPayload> {
  if (!llm.available) return payload;

  let title = payload.title;
  let summary = payload.summary;
  let content = payload.content;

  if (opts.title) {
    try {
      const out = await llm.run({
        task: "title",
        platformId,
        input: payload.title || stripForPrompt(payload.content),
        constraints: { maxChars: cap.limits.titleMax ?? 30 },
      });
      const cleaned = firstLine(out);
      if (cleaned) title = cap.limits.titleMax ? graphemeTruncate(cleaned, cap.limits.titleMax) : cleaned;
    } catch {
      /* 回退原标题 */
    }
  }

  if (opts.summary) {
    try {
      const out = await llm.run({
        task: "summary",
        platformId,
        input: stripForPrompt(payload.content),
        constraints: { maxChars: cap.limits.summaryMax ?? 120 },
      });
      const cleaned = out.trim();
      if (cleaned) summary = cap.limits.summaryMax ? graphemeTruncate(cleaned, cap.limits.summaryMax) : cleaned;
    } catch {
      /* 回退原摘要 */
    }
  }

  if (opts.colloquialize && cap.contentModel === "plaintext") {
    try {
      const out = await llm.run({ task: "colloquialize", platformId, input: payload.content });
      const cleaned = out.trim();
      if (cleaned) content = cap.limits.bodyMax ? graphemeTruncate(cleaned, cap.limits.bodyMax) : cleaned;
    } catch {
      /* 回退原正文 */
    }
  }

  return { ...payload, title, summary, content };
}

/** 取 HTML/文本前若干字作为 prompt 输入(避免超长)。 */
function stripForPrompt(content: string): string {
  const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 1000);
}

/** 取首行(标题应为单行)。 */
function firstLine(s: string): string {
  return s.split(/\r?\n/)[0]?.trim() ?? "";
}
