/**
 * 适配器基类 —— 封装公共逻辑,各平台只需实现 serialize + 声明 capabilities。
 */
import type { Asset, Capabilities, Document, PlatformOverride } from "../ir/types.js";
import { buildPipeline } from "../transforms/registry.js";
import { runPipeline, type TransformContext } from "../transforms/pipeline.js";
import type { PlatformConfig, ResolvedPlatformConfig } from "../config/platform-config.js";
import { sanitizeHtml, shouldSanitize } from "./shared/sanitize-html.js";
import type { PlatformAdapter, RehostContext, RehostResult, SerializedPayload } from "./types.js";

export abstract class BaseAdapter implements PlatformAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly capabilities: Capabilities;

  /** 应用平台能力对应的降级变换管线。可注入配置(违禁词表)。 */
  preprocess(doc: Document, _override?: PlatformOverride, config?: PlatformConfig): Document {
    const ctx: TransformContext = {
      platformId: this.id,
      capabilities: this.capabilities,
      bannedWords: config?.bannedWords,
    };
    const pipeline = buildPipeline(this.capabilities);
    return runPipeline(pipeline, doc, ctx);
  }

  /**
   * 序列化为平台产物,并对 HTML 产物统一净化(allowlist)。
   * 子类实现 serializeRaw;本方法是所有产物的统一出口,确保 HTML 经过净化护栏。
   */
  serialize(doc: Document, override?: PlatformOverride, config?: ResolvedPlatformConfig): SerializedPayload {
    const payload = this.serializeRaw(doc, override, config);
    if (shouldSanitize(payload.mime)) {
      return { ...payload, content: sanitizeHtml(payload.content) };
    }
    return payload;
  }

  /** 子类实现:IR → 平台原生序列化产物(净化前)。config 为主题/排版等运行时配置(可选)。 */
  protected abstract serializeRaw(
    doc: Document,
    override?: PlatformOverride,
    config?: ResolvedPlatformConfig,
  ): SerializedPayload;

  /** 默认重托管:调用注入的 upload,记录返回的 url/mediaId。 */
  async rehostAsset(asset: Asset, ctx: RehostContext): Promise<RehostResult> {
    const { url, mediaId } = await ctx.upload(asset);
    return { assetId: asset.id, url, mediaId };
  }

  /** 工具:取 override 标题或 meta 标题。 */
  protected resolveTitle(doc: Document, override?: PlatformOverride): string {
    return override?.title ?? doc.meta.title;
  }

  /** 工具:取 override 标签或 meta 标签。 */
  protected resolveTags(doc: Document, override?: PlatformOverride): readonly string[] {
    return override?.tags ?? doc.meta.tags;
  }

  /** 工具:收集文档中所有图片资产 id。 */
  protected collectImageAssetIds(doc: Document): string[] {
    const ids: string[] = [];
    const walk = (blocks: readonly Document["blocks"][number][]): void => {
      for (const b of blocks) {
        if (b.type === "image") ids.push(b.assetId);
        else if (b.type === "quote") walk(b.blocks);
        else if (b.type === "list") b.items.forEach(walk);
      }
    };
    walk(doc.blocks);
    return ids;
  }
}
