import type { Locator, Page } from "playwright";
import type { AutomationPublishReceipt, AutomationPublishRequest } from "../types.js";

const blockerPatterns: ReadonlyArray<[RegExp, string]> = [
  [/验证码|captcha/i, "验证码"],
  [/短信|sms/i, "短信验证"],
  [/扫码|二维码|登录|login/i, "登录"],
  [/风险|安全验证|人机/i, "风险验证"],
];

export interface EditorSelectors {
  readonly title: readonly string[];
  readonly body: readonly string[];
  readonly tags: readonly string[];
  readonly publish: readonly string[];
  readonly draft: readonly string[];
}

export async function detectHumanBlocker(page: Page): Promise<string | undefined> {
  const text = await page.locator("body").innerText({ timeout: 1_000 }).catch(() => "");
  for (const [pattern, label] of blockerPatterns) {
    if (pattern.test(text)) return label;
  }
  return undefined;
}

export async function runEditorAutomation(
  page: Page,
  request: AutomationPublishRequest,
  selectors: EditorSelectors,
): Promise<AutomationPublishReceipt> {
  const blocker = await detectHumanBlocker(page);
  if (blocker) {
    return { ok: false, status: "needs-user-action", message: `页面要求人工处理: ${blocker}` };
  }

  await fillFirst(page, selectors.title, request.payload.title);
  await fillBody(page, selectors.body, request.payload.content, request.payload.mime);
  await fillOptional(page, selectors.tags, request.payload.tags.join(","));

  if (request.mode === "draft") {
    const draft = await firstVisible(page, selectors.draft);
    if (draft) await draft.click();
    return { ok: true, status: "drafted", message: `${request.platformId} 已填写并保存/保留草稿` };
  }

  const publish = await firstVisible(page, selectors.publish);
  if (!publish) {
    return { ok: false, status: "failed", message: `${request.platformId} 未找到发布按钮` };
  }
  await publish.click();
  return { ok: true, status: "published", message: `${request.platformId} 已点击发布` };
}

async function fillFirst(page: Page, selectors: readonly string[], value: string): Promise<void> {
  const locator = await firstVisible(page, selectors);
  if (!locator) throw new Error(`missing editor field: ${selectors.join(", ")}`);
  await locator.fill(value);
}

async function fillBody(page: Page, selectors: readonly string[], value: string, mime: string): Promise<void> {
  const locator = await firstVisible(page, selectors);
  if (!locator) throw new Error(`missing body field: ${selectors.join(", ")}`);
  const text = mime === "text/html" ? htmlToPlainText(value) : value;
  await locator.fill(text);
}

async function fillOptional(page: Page, selectors: readonly string[], value: string): Promise<void> {
  const locator = await firstVisible(page, selectors);
  if (locator) await locator.fill(value);
}

async function firstVisible(page: Page, selectors: readonly string[]): Promise<Locator | undefined> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) return locator;
  }
  return undefined;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}
