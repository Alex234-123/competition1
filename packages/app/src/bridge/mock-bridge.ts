/**
 * MockBridge —— web 环境实现(普通网页,主演示路径)。
 *
 * 用浏览器原生 API:剪贴板用 navigator.clipboard,设置用 localStorage,
 * 公众号"真实发布"在 web 环境直接走 fetch 到 server(若配置),否则返回提示。
 */
import type {
  AssistedHandoffRequest,
  AssistedHandoffResult,
  ClipboardPayload,
  PlatformBridge,
  UploadAssetRequest,
  UploadAssetResult,
  WechatPublishRequest,
  WechatPublishResult,
} from "./types.js";
import { uploadAssetViaServer } from "./upload.js";

export class MockBridge implements PlatformBridge {
  readonly env = "web" as const;

  async writeClipboard(payload: ClipboardPayload): Promise<boolean> {
    try {
      if (payload.html && typeof ClipboardItem !== "undefined") {
        const item = new ClipboardItem({
          "text/html": new Blob([payload.html], { type: "text/html" }),
          "text/plain": new Blob([payload.text], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(payload.text);
      }
      return true;
    } catch {
      return false;
    }
  }

  async assistedHandoff(req: AssistedHandoffRequest): Promise<AssistedHandoffResult> {
    // web 环境无法注入目标平台编辑器(跨域),只能复制到剪贴板。
    const ok = await this.writeClipboard(req.clipboard);
    return {
      ok,
      method: ok ? "clipboard" : "failed",
      message: ok
        ? "已复制到剪贴板,请到目标平台编辑器 Ctrl+V 粘贴(web 环境不支持自动注入,需用扩展)"
        : "复制失败,请检查浏览器剪贴板权限",
    };
  }

  async publishWechat(req: WechatPublishRequest): Promise<WechatPublishResult> {
    try {
      const res = await fetch(`${req.serverUrl}/wechat/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.payload),
      });
      const data = (await res.json()) as { ok: boolean; message: string; remoteId?: string };
      return data;
    } catch (err) {
      return {
        ok: false,
        message: `无法连接本地 server(${req.serverUrl}):${err instanceof Error ? err.message : String(err)}。请先启动 server 包。`,
      };
    }
  }

  async uploadAsset(req: UploadAssetRequest): Promise<UploadAssetResult> {
    return uploadAssetViaServer(req);
  }

  async getSetting(key: string): Promise<string | undefined> {
    return localStorage.getItem(key) ?? undefined;
  }

  async setSetting(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }
}
