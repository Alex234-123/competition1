/**
 * 公众号官方 API 请求构造 —— 纯逻辑,HTTP 客户端注入。
 *
 * 安全边界:本模块只构造请求(URL/method/body),绝不持有 AppSecret,绝不在前端执行。
 * 真实网络调用由 server 注入的 HttpClient 完成(server 持密钥、在白名单 IP 上跑)。
 *
 * 发布流水线(调研确认):
 *   stable_token → 上传永久封面(thumb_media_id) → media/uploadimg(正文图) → draft/add → freepublish/submit
 */
import type { SerializedPayload } from "../adapters/types.js";

const BASE = "https://api.weixin.qq.com/cgi-bin";

/** 注入的 HTTP 客户端(server 实现真实 fetch)。 */
export interface HttpClient {
  postJson(url: string, body: unknown): Promise<unknown>;
  getJson(url: string): Promise<unknown>;
}

/** stable_token 请求构造。 */
export function buildStableTokenRequest(appId: string, appSecret: string): { url: string; body: unknown } {
  return {
    url: `${BASE}/stable_token`,
    body: { grant_type: "client_credential", appid: appId, secret: appSecret, force_refresh: false },
  };
}

/** draft/add 单篇文章结构(news 图文)。 */
export interface WechatArticle {
  readonly article_type: "news";
  readonly title: string;
  readonly author: string;
  readonly digest: string;
  readonly content: string;
  readonly content_source_url: string;
  readonly thumb_media_id: string;
  readonly need_open_comment: 0 | 1;
  readonly only_fans_can_comment: 0 | 1;
}

/** 从序列化产物构造 draft/add 的文章对象(thumb_media_id 由调用方在上传封面后填入)。 */
export function buildDraftArticle(payload: SerializedPayload, thumbMediaId: string): WechatArticle {
  const extra = payload.extra ?? {};
  return {
    article_type: "news",
    title: payload.title,
    author: String(extra["author"] ?? ""),
    digest: payload.summary ?? "",
    content: payload.content,
    content_source_url: String(extra["contentSourceUrl"] ?? ""),
    thumb_media_id: thumbMediaId,
    need_open_comment: 0,
    only_fans_can_comment: 0,
  };
}

/** draft/add 请求构造。 */
export function buildDraftAddRequest(accessToken: string, articles: readonly WechatArticle[]): { url: string; body: unknown } {
  return {
    url: `${BASE}/draft/add?access_token=${encodeURIComponent(accessToken)}`,
    body: { articles },
  };
}

/** freepublish/submit 请求构造(发布草稿)。 */
export function buildFreepublishRequest(accessToken: string, draftMediaId: string): { url: string; body: unknown } {
  return {
    url: `${BASE}/freepublish/submit?access_token=${encodeURIComponent(accessToken)}`,
    body: { media_id: draftMediaId },
  };
}

/** media/uploadimg URL(正文图片上传,multipart 由 server 处理)。 */
export function uploadImgUrl(accessToken: string): string {
  return `${BASE}/media/uploadimg?access_token=${encodeURIComponent(accessToken)}`;
}

/** 新增永久素材 URL(封面图,返回 media_id 作 thumb_media_id)。 */
export function addMaterialUrl(accessToken: string, type: "image" = "image"): string {
  return `${BASE}/material/add_material?access_token=${encodeURIComponent(accessToken)}&type=${type}`;
}

/** 微信 API 错误码解读(常见)。 */
export function explainWechatError(errcode: number): string {
  const map: Record<number, string> = {
    40164: "调用方 IP 不在白名单(请在公众号后台添加本机出口 IP)",
    40007: "无效的 media_id(封面需用永久素材 id,而非临时)",
    40001: "access_token 无效或过期",
    45009: "接口调用频率超限",
    48001: "API 功能未授权(需认证的订阅号/服务号)",
  };
  return map[errcode] ?? `未知错误码 ${errcode}`;
}
