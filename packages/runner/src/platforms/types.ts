import type { Page } from "playwright";
import type { AutomationPlatformId, AutomationPublishReceipt, AutomationPublishRequest } from "../types.js";

export interface AutomationPlatformAdapter {
  readonly platformId: AutomationPlatformId;
  readonly editorUrl: string;
  publish(page: Page, request: AutomationPublishRequest): Promise<AutomationPublishReceipt>;
}
