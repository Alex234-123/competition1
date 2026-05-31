/** B站专栏适配器装配。 */
import type { Asset, Capabilities, Document, PlatformOverride } from "../../ir/types.js";
import { BaseAdapter } from "../base-adapter.js";
import type { RehostContext, RehostResult, SerializedPayload } from "../types.js";
import type { ResolvedPlatformConfig } from "../../config/platform-config.js";
import { bilibiliCapabilities } from "./capabilities.js";
import { serializeBilibili } from "./serialize.js";

export class BilibiliAdapter extends BaseAdapter {
  readonly id = "bilibili";
  readonly name = "B站专栏";
  readonly capabilities: Capabilities = bilibiliCapabilities;

  protected serializeRaw(
    doc: Document,
    override?: PlatformOverride,
    _config?: ResolvedPlatformConfig,
  ): SerializedPayload {
    return serializeBilibili(doc, override);
  }

  /** B站图片有防盗链限制,需要重托管到可访问的 CDN/图床。默认走注入的 upload,上传失败时记录诊断信息。 */
  override async rehostAsset(asset: Asset, ctx: RehostContext): Promise<RehostResult> {
    // 先走默认上传流程(上传到配置的图床 server)
    const result = await super.rehostAsset(asset, ctx);
    // B站防盗链:若无重托管 URL,序列化时回退到原始 URL,
    // 由校验规则 checkImageRehost 在发布前提醒用户。
    return result;
  }
}
