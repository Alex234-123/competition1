/**
 * ChromeBridge —— 扩展环境实现。
 *
 * 剪贴板用 navigator.clipboard(在扩展页执行,有 document focus);
 * 辅助发布通过 chrome.tabs/scripting 向目标平台页注入;设置用 chrome.storage;
 * 公众号发布转发到本地 server。
 */
import type {
  AssistedHandoffRequest,
  AssistedHandoffResult,
  AutomationPublishRequest,
  AutomationPublishResult,
  ClipboardPayload,
  PlatformBridge,
  UploadAssetRequest,
  UploadAssetResult,
  WechatPublishRequest,
  WechatPublishResult,
} from "./types.js";
import { uploadAssetViaServer } from "./upload.js";

export class ChromeBridge implements PlatformBridge {
  readonly env = "extension" as const;

  async writeClipboard(payload: ClipboardPayload): Promise<boolean> {
    try {
      if (payload.html && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([payload.html], { type: "text/html" }),
            "text/plain": new Blob([payload.text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(payload.text);
      }
      return true;
    } catch {
      return false;
    }
  }

  async assistedHandoff(req: AssistedHandoffRequest): Promise<AssistedHandoffResult> {
    // 先复制到剪贴板(稳健默认)。
    const copied = await this.writeClipboard(req.clipboard);
    if (!req.tryInject) {
      return {
        ok: copied,
        method: copied ? "clipboard" : "failed",
        message: copied ? "已复制,请到目标平台 Ctrl+V 粘贴" : "复制失败",
      };
    }
    // best-effort:向已激活的目标平台标签页注入(失败降级到复制粘贴)。
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("无活动标签页");
      const result = await chrome.tabs.sendMessage(tab.id, {
        type: "mpp-inject",
        platformId: req.platformId,
        clipboard: req.clipboard,
      });
      if (result?.injected) {
        return { ok: true, method: "injected", message: "已尝试自动填入编辑器(请检查并确认)" };
      }
      throw new Error(result?.reason ?? "注入未生效");
    } catch (err) {
      return {
        ok: copied,
        method: copied ? "clipboard" : "failed",
        message: `自动注入未成功(${err instanceof Error ? err.message : String(err)}),已复制到剪贴板,请手动 Ctrl+V 粘贴`,
      };
    }
  }

  async publishWechat(req: WechatPublishRequest): Promise<WechatPublishResult> {
    try {
      const res = await fetch(`${req.serverUrl}/wechat/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.payload),
      });
      return (await res.json()) as WechatPublishResult;
    } catch (err) {
      return { ok: false, message: `无法连接 server:${err instanceof Error ? err.message : String(err)}` };
    }
  }

  async publishAutomation(req: AutomationPublishRequest): Promise<AutomationPublishResult> {
    try {
      const res = await fetch(`${req.runnerUrl}/automation/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId: req.platformId,
          mode: req.mode,
          payload: req.payload,
        }),
      });
      return (await res.json()) as AutomationPublishResult;
    } catch (err) {
      return {
        ok: false,
        status: "failed",
        message: `无法连接 runner:${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async uploadAsset(req: UploadAssetRequest): Promise<UploadAssetResult> {
    return uploadAssetViaServer(req);
  }

  async getSetting(key: string): Promise<string | undefined> {
    const obj = await chrome.storage.local.get(key);
    return obj[key] as string | undefined;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }
}
