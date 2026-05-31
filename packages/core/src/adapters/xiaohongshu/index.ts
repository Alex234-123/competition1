/** 小红书适配器装配。 */
import type { Capabilities, Document, PlatformOverride } from "../../ir/types.js";
import { BaseAdapter } from "../base-adapter.js";
import type { SerializedPayload } from "../types.js";
import type { ResolvedPlatformConfig } from "../../config/platform-config.js";
import { xiaohongshuCapabilities } from "./capabilities.js";
import { serializeXiaohongshu } from "./serialize.js";

export class XiaohongshuAdapter extends BaseAdapter {
  readonly id = "xiaohongshu";
  readonly name = "小红书";
  readonly capabilities: Capabilities = xiaohongshuCapabilities;

  protected serializeRaw(
    doc: Document,
    override?: PlatformOverride,
    _config?: ResolvedPlatformConfig,
  ): SerializedPayload {
    return serializeXiaohongshu(doc, override);
  }
}
