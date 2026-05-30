/**
 * content script —— 监听来自扩展页的注入请求,best-effort 填入目标平台编辑器。
 *
 * 安全姿态:只填入内容供用户检查确认,绝不自动点击"发布/提交"按钮。
 */
import { injectForPlatform } from "./injectors.js";
import { applySelectorOverride } from "./selectors.js";

interface InjectMessage {
  readonly type: "mpp-inject";
  readonly platformId: string;
  readonly clipboard: { html?: string; text: string };
}

// 启动时加载远程选择器覆盖(平台改版后不发版即可修复注入)。
void chrome.storage?.local?.get("mpp.selectors").then((obj) => {
  applySelectorOverride(obj?.["mpp.selectors"] as string | undefined);
});

chrome.runtime.onMessage.addListener((msg: InjectMessage, _sender, sendResponse) => {
  if (msg?.type !== "mpp-inject") return;
  const result = injectForPlatform(msg.platformId, msg.clipboard.html ?? "", msg.clipboard.text);
  sendResponse(result);
  return true; // 异步响应
});
