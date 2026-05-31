import type { Page } from "playwright";
import type { AutomationPublishReceipt, AutomationPublishRequest } from "../types.js";
import { runEditorAutomation, type EditorSelectors } from "./common.js";
import type { AutomationPlatformAdapter } from "./types.js";

const selectors: EditorSelectors = {
  title: ['[data-mpp-field="title"]', 'input[placeholder*="标题"]'],
  body: ['[data-mpp-field="body"]', '[contenteditable="true"]'],
  tags: ['[data-mpp-field="tags"]', 'input[placeholder*="标签"]'],
  publish: ['[data-mpp-action="publish"]', 'button:has-text("发布")', 'button:has-text("提交")'],
  draft: ['[data-mpp-action="save-draft"]', 'button:has-text("存草稿")', 'button:has-text("保存")'],
};

export class BilibiliAutomationAdapter implements AutomationPlatformAdapter {
  readonly platformId = "bilibili" as const;
  readonly editorUrl = "https://member.bilibili.com/platform/upload/text/apply";

  publish(page: Page, request: AutomationPublishRequest): Promise<AutomationPublishReceipt> {
    return runEditorAutomation(page, request, selectors);
  }
}
