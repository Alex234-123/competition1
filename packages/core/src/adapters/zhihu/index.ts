/** 知乎适配器装配。 */
import type { Capabilities, Document, PlatformOverride } from "../../ir/types.js";
import { BaseAdapter } from "../base-adapter.js";
import type { SerializedPayload } from "../types.js";
import type { ResolvedPlatformConfig } from "../../config/platform-config.js";
import { zhihuCapabilities } from "./capabilities.js";
import { serializeZhihu } from "./serialize.js";

export class ZhihuAdapter extends BaseAdapter {
  readonly id = "zhihu";
  readonly name = "知乎";
  readonly capabilities: Capabilities = zhihuCapabilities;

  protected serializeRaw(
    doc: Document,
    override?: PlatformOverride,
    _config?: ResolvedPlatformConfig,
  ): SerializedPayload {
    return serializeZhihu(doc, override);
  }
}
