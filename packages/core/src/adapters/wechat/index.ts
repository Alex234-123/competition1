/** 微信公众号适配器装配。 */
import type { Capabilities, Document, PlatformOverride } from "../../ir/types.js";
import { BaseAdapter } from "../base-adapter.js";
import type { SerializedPayload } from "../types.js";
import { wechatCapabilities } from "./capabilities.js";
import { serializeWechat } from "./serialize.js";

export class WechatAdapter extends BaseAdapter {
  readonly id = "wechat";
  readonly name = "微信公众号";
  readonly capabilities: Capabilities = wechatCapabilities;

  protected serializeRaw(doc: Document, override?: PlatformOverride): SerializedPayload {
    return serializeWechat(doc, override);
  }
}
