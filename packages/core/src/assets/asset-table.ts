/**
 * 资产表 —— 图片/音视频作为一等公民管理。
 *
 * 关键约束:同一张图在不同平台需分别重托管(公众号过滤外链 img、B站防盗链 403),
 * 因此重托管结果按 (assetId, platformId) 维度记录,绝不跨平台共享。
 */
import type { Asset, AssetKind, AssetSource, RehostRecord } from "../ir/types.js";

export class AssetTable {
  private readonly assets = new Map<string, Asset>();
  private counter = 0;

  /** 登记一个资产,返回其 id。若同源 URL 已存在则去重复用。 */
  add(kind: AssetKind, source: AssetSource, meta?: Partial<Omit<Asset, "id" | "kind" | "source" | "rehosted">>): string {
    const existing = this.findBySource(source);
    if (existing) return existing.id;

    const id = `asset-${++this.counter}`;
    this.assets.set(id, {
      id,
      kind,
      source,
      rehosted: {},
      ...meta,
    });
    return id;
  }

  get(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  all(): readonly Asset[] {
    return [...this.assets.values()];
  }

  /** 记录某平台的重托管结果。 */
  recordRehost(id: string, platformId: string, record: RehostRecord): void {
    const asset = this.assets.get(id);
    if (!asset) throw new Error(`资产不存在: ${id}`);
    this.assets.set(id, {
      ...asset,
      rehosted: { ...asset.rehosted, [platformId]: record },
    });
  }

  /** 查询某资产在某平台是否已重托管。 */
  getRehost(id: string, platformId: string): RehostRecord | undefined {
    return this.assets.get(id)?.rehosted[platformId];
  }

  private findBySource(source: AssetSource): Asset | undefined {
    for (const asset of this.assets.values()) {
      const s = asset.source;
      if (
        (source.url && s.url === source.url) ||
        (source.localPath && s.localPath === source.localPath) ||
        (source.dataUrl && s.dataUrl === source.dataUrl)
      ) {
        return asset;
      }
    }
    return undefined;
  }
}

/** 从一组已有 Asset 重建资产表(用于反序列化/测试)。 */
export function assetTableFrom(assets: readonly Asset[]): AssetTable {
  const table = new AssetTable();
  for (const a of assets) {
    const id = table.add(a.kind, a.source, {
      mime: a.mime,
      width: a.width,
      height: a.height,
      bytes: a.bytes,
    });
    for (const [platform, record] of Object.entries(a.rehosted)) {
      table.recordRehost(id, platform, record);
    }
  }
  return table;
}
