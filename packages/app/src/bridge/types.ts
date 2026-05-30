/**
 * PlatformBridge —— 隔离 chrome.* 的抽象层。
 *
 * UI 只调 bridge 接口,从不直接碰 chrome.*。web 环境注入 MockBridge(浏览器原生 API),
 * 扩展环境注入 ChromeBridge(chrome.* + 转发 server)。这是 web/扩展双构建复用同一套 UI 的关键。
 */

export interface ClipboardPayload {
  /** 富文本 HTML(公众号/知乎/B站)。 */
  readonly html?: string;
  /** 纯文本兜底(必须,Chrome 要求)。 */
  readonly text: string;
}

export interface AssistedHandoffRequest {
  readonly platformId: string;
  readonly clipboard: ClipboardPayload;
  /** 是否尝试自动注入编辑器(best-effort)。 */
  readonly tryInject?: boolean;
}

export interface AssistedHandoffResult {
  readonly ok: boolean;
  /** 实际采用的方式。 */
  readonly method: "clipboard" | "injected" | "failed";
  readonly message: string;
}

export interface WechatPublishRequest {
  readonly serverUrl: string;
  readonly payload: unknown;
}

export interface WechatPublishResult {
  readonly ok: boolean;
  readonly message: string;
  readonly remoteId?: string;
}

/** 图片上传请求(转发到 server /upload)。 */
export interface UploadAssetRequest {
  readonly serverUrl: string;
  readonly bytes: Uint8Array;
  readonly filename: string;
  readonly mime: string;
}

export interface UploadAssetResult {
  readonly ok: boolean;
  readonly url?: string;
  readonly mediaId?: string;
  readonly message?: string;
}

export interface PlatformBridge {
  readonly env: "web" | "extension";

  /** 写富文本到剪贴板(用户手势中调用)。 */
  writeClipboard(payload: ClipboardPayload): Promise<boolean>;

  /** 辅助发布:复制粘贴 + best-effort 注入(仅扩展)。 */
  assistedHandoff(req: AssistedHandoffRequest): Promise<AssistedHandoffResult>;

  /** 公众号真实发布(转发到本地 server)。 */
  publishWechat(req: WechatPublishRequest): Promise<WechatPublishResult>;

  /** 图片上传到图床(转发到本地 server /upload)。 */
  uploadAsset(req: UploadAssetRequest): Promise<UploadAssetResult>;

  /** 读取持久化设置。 */
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
}
