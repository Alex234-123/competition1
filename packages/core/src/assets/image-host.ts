/**
 * 图床契约 —— core 只定义接口,实现在 server(对象存储/微信)或 app(转发)注入。
 *
 * 分两层:
 *   - ImageHost:字节级上传(bytes/filename/mime → 公开 URL 或平台 mediaId),最底层。
 *   - RehostContext(adapters/types.ts):资产级重托管(Asset → {url,mediaId}),适配器消费。
 * 本文件提供把 ImageHost 适配为 RehostContext.upload 的辅助,使二者解耦。
 */
import type { Asset } from "../ir/types.js";

/** 上传结果:对象存储返回公开 URL;微信永久素材返回 mediaId(+可选 URL)。 */
export interface ImageUploadResult {
  readonly url?: string;
  readonly mediaId?: string;
}

/** 字节级图床接口。实现示例:S3 兼容对象存储、本地落盘、微信 uploadimg。 */
export interface ImageHost {
  readonly id: string;
  /** 上传图片字节,返回公开 URL 或平台 mediaId。 */
  upload(bytes: Uint8Array, filename: string, mime: string): Promise<ImageUploadResult>;
}

/** 从 Asset 取出可上传的字节(支持 dataUrl;url/localPath 由调用方在 server 侧解析)。 */
export function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] || "application/octet-stream";
  const isBase64 = !!m[2];
  const data = m[3] ?? "";
  if (isBase64) {
    const binary = atobUniversal(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, mime };
  }
  // 非 base64:URI 编码文本。
  const text = decodeURIComponent(data);
  const bytes = new TextEncoder().encode(text);
  return { bytes, mime };
}

/** 跨环境 atob(浏览器原生;Node 用 Buffer)。 */
function atobUniversal(b64: string): string {
  if (typeof atob === "function") return atob(b64);
  // Node 环境:Buffer 可用。
  const g = globalThis as { Buffer?: { from(s: string, enc: string): { toString(enc: string): string } } };
  if (g.Buffer) return g.Buffer.from(b64, "base64").toString("binary");
  throw new Error("无可用的 base64 解码器");
}

/** 推断资产的文件名(用于上传)。 */
export function assetFilename(asset: Asset): string {
  const ext = mimeToExt(asset.mime);
  return `${asset.id}.${ext}`;
}

function mimeToExt(mime?: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
}
