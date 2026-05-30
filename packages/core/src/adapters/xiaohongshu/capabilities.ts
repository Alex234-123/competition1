/** 小红书能力声明。 */
import type { Capabilities } from "../../ir/types.js";

export const xiaohongshuCapabilities: Capabilities = {
  contentModel: "plaintext", // 纯文本 + emoji + #话题#
  supportsExternalLinks: false, // 链接无效,转文字
  supportsTables: false, // 转图片卡片
  supportsMath: "text", // 无公式,降级文字
  supportsCodeBlocks: "text",
  requiresCover: true, // 必须有图(无图无法发)
  requiresImageRehost: false,
  countByGrapheme: true, // 标题≤20/正文≤1000 按字素簇
  bannedWordFilter: true, // 违禁/极限词过滤
  taxonomy: "free-tags",
  limits: {
    titleMax: 20, // 硬上限 20 字
    bodyMax: 1000, // 正文 ≤1000 字
    tagsMax: 10,
    maxImages: 9, // 九宫格
  },
  publishers: ["assisted", "mock"], // 无自助发布 API
};
