/** B站专栏适配器装配。 */
import type { Capabilities, Document, PlatformOverride } from "../../ir/types.js";
import { BaseAdapter } from "../base-adapter.js";
import type { SerializedPayload } from "../types.js";
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
}
