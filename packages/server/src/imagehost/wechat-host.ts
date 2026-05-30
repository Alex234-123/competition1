/** 微信图床 —— 公众号正文图走 media/uploadimg(返回 mp CDN URL),封面走 add_material(返回 media_id)。
 *
 * 与对象存储不同:微信正文图 uploadimg 返回的 URL 仅能用于公众号图文,不可外用;
 * 封面必须是永久素材 media_id。故本 host 同时返回 url 与 mediaId,调用方按需取用。
 */
import { WechatApi, type ImageHost, type ImageUploadResult } from "@mpp/core";

/** 获取有效 access_token 的注入函数(来自 TokenCache)。 */
export type TokenProvider = () => Promise<string>;

export class WechatImageHost implements ImageHost {
  readonly id = "wechat";

  /**
   * @param getToken 返回有效 access_token
   * @param mode "image"=正文图(uploadimg);"material"=封面永久素材(add_material)
   */
  constructor(
    private readonly getToken: TokenProvider,
    private readonly mode: "image" | "material" = "image",
  ) {}

  async upload(bytes: Uint8Array, filename: string, mime: string): Promise<ImageUploadResult> {
    const token = await this.getToken();
    const blob = new Blob([bytes], { type: mime || "image/png" });
    const form = new FormData();
    form.append("media", blob, filename);

    if (this.mode === "image") {
      // media/uploadimg:正文图,返回可用于图文的 URL。
      const res = await fetch(WechatApi.uploadImgUrl(token), { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; errcode?: number; errmsg?: string };
      if (!data.url) {
        throw new Error(`uploadimg 失败: ${explain(data.errcode)} (errcode=${data.errcode} ${data.errmsg ?? ""})`);
      }
      return { url: data.url };
    }

    // add_material:封面永久素材,返回 media_id。
    const res = await fetch(WechatApi.addMaterialUrl(token), { method: "POST", body: form });
    const data = (await res.json()) as { media_id?: string; url?: string; errcode?: number; errmsg?: string };
    if (!data.media_id) {
      throw new Error(`add_material 失败: ${explain(data.errcode)} (errcode=${data.errcode} ${data.errmsg ?? ""})`);
    }
    return { mediaId: data.media_id, url: data.url };
  }
}

function explain(errcode?: number): string {
  return errcode ? WechatApi.explainWechatError(errcode) : "未知错误";
}
