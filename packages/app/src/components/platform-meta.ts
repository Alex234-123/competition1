/** 平台品牌元数据:颜色 token 名,供 chip 与预览卡片复用。 */
export const PLATFORM_COLORS: Record<string, string> = {
  wechat: "var(--brand-wechat)",
  zhihu: "var(--brand-zhihu)",
  bilibili: "var(--brand-bilibili)",
  xiaohongshu: "var(--brand-xiaohongshu)",
};

export function platformColor(id: string): string {
  return PLATFORM_COLORS[id] ?? "var(--accent)";
}
