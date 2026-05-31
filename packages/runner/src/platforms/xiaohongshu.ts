import type { Page } from "playwright";
import type { AutomationPublishReceipt, AutomationPublishRequest } from "../types.js";
import { runEditorAutomation, type EditorSelectors } from "./common.js";
import type { AutomationPlatformAdapter } from "./types.js";

const selectors: EditorSelectors = {
  title: ['[data-mpp-field="title"]', 'input[placeholder*="标题"]'],
  body: ['[data-mpp-field="body"]', 'textarea[placeholder*="正文"]', '[contenteditable="true"]'],
  tags: ['[data-mpp-field="tags"]', 'input[placeholder*="话题"]'],
  publish: ['[data-mpp-action="publish"]', 'button:has-text("发布")'],
  draft: ['[data-mpp-action="save-draft"]', 'button:has-text("保存")'],
};

export class XiaohongshuAutomationAdapter implements AutomationPlatformAdapter {
  readonly platformId = "xiaohongshu" as const;
  readonly editorUrl = "https://creator.xiaohongshu.com/publish/publish";

  publish(page: Page, request: AutomationPublishRequest): Promise<AutomationPublishReceipt> {
    return runEditorAutomation(page, request, selectors);
  }
}
