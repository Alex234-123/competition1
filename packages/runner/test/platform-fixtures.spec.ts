import { existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { getAutomationAdapter } from "../src/platforms/registry.js";
import type { AutomationMode, AutomationPlatformId, AutomationPublishRequest } from "../src/types.js";

let browser: Browser | undefined;
const hasChromium = existsSync(chromium.executablePath());

beforeAll(async () => {
  if (!hasChromium) return;
  browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
  await browser?.close();
});

describe.skipIf(!hasChromium)("platform automation adapters on fixture pages", () => {
  for (const platformId of ["zhihu", "bilibili", "xiaohongshu"] as const) {
    it(`${platformId} fills fixture editor and does not publish in draft mode`, async () => {
      const page = await newFixturePage(platformId);
      const adapter = getAutomationAdapter(platformId);

      const receipt = await adapter.publish(page, request(platformId, "draft"));

      expect(receipt).toMatchObject({ ok: true, status: "drafted" });
      await expectFilled(page, platformId);
      expect(await page.locator('[data-testid="published"]').textContent()).toBe("false");
    });

    it(`${platformId} clicks publish in full-auto mode`, async () => {
      const page = await newFixturePage(platformId);
      const adapter = getAutomationAdapter(platformId);

      const receipt = await adapter.publish(page, request(platformId, "full-auto"));

      expect(receipt).toMatchObject({ ok: true, status: "published" });
      await expectFilled(page, platformId);
      expect(await page.locator('[data-testid="published"]').textContent()).toBe("true");
    });
  }

  it("stops when a human verification blocker is visible", async () => {
    const page = await browser.newPage();
    await page.setContent(`
      <main data-platform="zhihu">
        <div>请完成验证码验证</div>
        <input data-mpp-field="title" />
        <div data-mpp-field="body" contenteditable="true"></div>
        <button data-mpp-action="publish">发布</button>
      </main>
    `);

    const receipt = await getAutomationAdapter("zhihu").publish(page, request("zhihu", "full-auto"));

    expect(receipt).toEqual({
      ok: false,
      status: "needs-user-action",
      message: "页面要求人工处理: 验证码",
    });
  });
});

async function newFixturePage(platformId: Exclude<AutomationPlatformId, "wechat">): Promise<Page> {
  if (!browser) throw new Error("Playwright Chromium is unavailable for fixture tests");
  const page = await browser.newPage();
  await page.setContent(`
    <main data-platform="${platformId}">
      <input data-mpp-field="title" />
      <div data-mpp-field="body" contenteditable="true"></div>
      <input data-mpp-field="tags" />
      <input data-mpp-field="cover" type="file" />
      <button data-mpp-action="save-draft">保存草稿</button>
      <button data-mpp-action="publish" onclick="document.querySelector('[data-testid=published]').textContent='true'">发布</button>
      <span data-testid="published">false</span>
    </main>
  `);
  return page;
}

function request(platformId: AutomationPlatformId, mode: AutomationMode): AutomationPublishRequest {
  return {
    platformId,
    mode,
    payload: {
      title: `${platformId} 标题`,
      content: platformId === "xiaohongshu" ? "小红书正文\n#效率工具" : `<p>${platformId} 正文</p>`,
      mime: platformId === "xiaohongshu" ? "text/plain" : "text/html",
      tags: ["效率", "创作"],
    },
  };
}

async function expectFilled(page: Page, platformId: AutomationPlatformId): Promise<void> {
  expect(await page.locator('[data-mpp-field="title"]').inputValue()).toBe(`${platformId} 标题`);
  const body = await page.locator('[data-mpp-field="body"]').textContent();
  expect(body).toContain(platformId === "xiaohongshu" ? "小红书正文" : `${platformId} 正文`);
  expect(await page.locator('[data-mpp-field="tags"]').inputValue()).toBe("效率,创作");
}
