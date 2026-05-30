/** 微信公众号能力声明。 */
import type { Capabilities } from "../../ir/types.js";

export const wechatCapabilities: Capabilities = {
  contentModel: "inline-html", // 全内联样式 HTML
  supportsExternalLinks: false, // 外链被屏蔽 → 转脚注
  supportsTables: true, // 表格保留(简单表格可渲染)
  supportsMath: "none", // 无原生公式
  supportsCodeBlocks: "native",
  requiresCover: true, // 需要封面(thumb_media_id)
  requiresImageRehost: true, // 正文外链图被过滤 → media/uploadimg
  countByGrapheme: true,
  bannedWordFilter: false,
  taxonomy: "free-tags", // 话题标签(API 不可设,仅提示)
  limits: {
    titleMax: 64, // 硬上限 64 字
    bodyMax: 50000,
    summaryMax: 120, // digest ≤120
    authorMax: 8,
  },
  publishers: ["official", "assisted", "mock"], // 唯一有官方 API 的平台
};
