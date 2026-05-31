import type { AutomationPlatformId } from "../types.js";
import { BilibiliAutomationAdapter } from "./bilibili.js";
import type { AutomationPlatformAdapter } from "./types.js";
import { WechatAutomationAdapter } from "./wechat.js";
import { XiaohongshuAutomationAdapter } from "./xiaohongshu.js";
import { ZhihuAutomationAdapter } from "./zhihu.js";

const adapters = new Map<AutomationPlatformId, AutomationPlatformAdapter>();

registerAutomationAdapter(new WechatAutomationAdapter());
registerAutomationAdapter(new ZhihuAutomationAdapter());
registerAutomationAdapter(new BilibiliAutomationAdapter());
registerAutomationAdapter(new XiaohongshuAutomationAdapter());

export function registerAutomationAdapter(adapter: AutomationPlatformAdapter): void {
  adapters.set(adapter.platformId, adapter);
}

export function getAutomationAdapter(platformId: AutomationPlatformId): AutomationPlatformAdapter {
  const adapter = adapters.get(platformId);
  if (!adapter) throw new Error(`No automation adapter registered for ${platformId}`);
  return adapter;
}

export function listAutomationAdapters(): readonly AutomationPlatformAdapter[] {
  return [...adapters.values()];
}
