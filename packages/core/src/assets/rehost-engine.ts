/**
 * 资产重托管编排 —— 把"遍历文档图片资产 → 调适配器 rehostAsset → 回填 IR"串起来。
 *
 * 为什么需要:公众号正文外链图被过滤、B站图片防盗链 403、小红书须本地图,
 * 都要求把图片重托管到目标平台/图床。重托管结果按 (assetId, platformId) 写回
 * Asset.rehosted,使后续 serialize 的 resolveImageSrc 取到平台 URL。
 *
 * 纯编排 + 网络注入:core 不直接发请求,upload 由 server/app 注入(RehostContext)。
 */
import type { Asset, Document } from "../ir/types.js";
import type { PlatformAdapter, RehostContext } from "../adapters/types.js";

/** 判断资产是否为可重托管的真实图片(排除变换生成的占位/平台原生资产)。 */
function isRehostable(asset: Asset): boolean {
  // 变换生成的表格图/公式图是平台原生或待 app 渲染,不走图床。
  if (asset.source.generated) return false;
  const url = asset.source.url ?? "";
  const dataUrl = asset.source.dataUrl ?? "";
  // 真实图片:http(s) 外链,或标准 data:image dataURL。
  if (/^https?:\/\//.test(url)) return true;
  if (/^data:image\//.test(dataUrl)) return true;
  return false;
}

/**
 * 对文档内所有可重托管图片资产执行平台重托管,返回回填后的新文档(不可变)。
 *
 * @param adapter 目标平台适配器(提供 rehostAsset 策略)
 * @param doc 已 preprocess 的文档
 * @param ctx 重托管上下文(含注入的 upload)
 * @returns 资产已回填 rehosted[platformId] 的新文档
 */
export async function rehostDocumentAssets(
  adapter: PlatformAdapter,
  doc: Document,
  ctx: RehostContext,
): Promise<Document> {
  const imageAssets = doc.assets.filter((a) => a.kind === "image" && isRehostable(a));
  if (imageAssets.length === 0) return doc;

  const updates = new Map<string, Asset>();
  for (const asset of imageAssets) {
    // 已有该平台重托管结果则跳过(幂等)。
    if (asset.rehosted[ctx.platformId]) continue;
    try {
      const result = await adapter.rehostAsset(asset, ctx);
      if (result.url || result.mediaId) {
        updates.set(asset.id, {
          ...asset,
          rehosted: {
            ...asset.rehosted,
            [ctx.platformId]: { url: result.url, mediaId: result.mediaId },
          },
        });
      }
    } catch {
      // 单图失败不阻断:保留原始引用,由校验/序列化层决定降级。
    }
  }

  if (updates.size === 0) return doc;
  return {
    ...doc,
    assets: doc.assets.map((a) => updates.get(a.id) ?? a),
  };
}
