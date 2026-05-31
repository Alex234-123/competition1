import type { Page } from "playwright";
import type { AutomationPublishReceipt, AutomationPublishRequest } from "../types.js";
import { runEditorAutomation, type EditorSelectors } from "./common.js";
import type { AutomationPlatformAdapter } from "./types.js";

const selectors: EditorSelectors = {
  title: ['[data-mpp-field="title"]', 'input[placeholder*="标题"]'],
  body: ['[data-mpp-field="body"]', '[contenteditable="true"]'],
  tags: ['[data-mpp-field="tags"]'],
  publish: ['[data-mpp-action="publish"]', 'button:has-text("发表")', 'button:has-text("发布")'],
  draft: ['[data-mpp-action="save-draft"]', 'button:has-text("保存")'],
};

export class WechatAutomationAdapter implements AutomationPlatformAdapter {
  readonly platformId = "wechat" as const;
  readonly editorUrl = "https://mp.weixin.qq.com/";

  publish(page: Page, request: AutomationPublishRequest): Promise<AutomationPublishReceipt> {
    return runEditorAutomation(page, request, selectors);
  }
}
