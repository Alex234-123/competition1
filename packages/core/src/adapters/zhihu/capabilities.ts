/** 知乎能力声明。 */
import type { Capabilities } from "../../ir/types.js";

export const zhihuCapabilities: Capabilities = {
  contentModel: "rich-clipboard", // 可粘贴富文本
  supportsExternalLinks: true, // 知乎允许外链
  supportsTables: true, // 表格转 HTML 表格(变换层不处理,序列化输出 HTML table)
  supportsMath: "image", // 公式 → equation 图片
  supportsCodeBlocks: "native",
  requiresCover: false, // 封面可选
  requiresImageRehost: false, // 粘贴时知乎自动重传到自有 CDN
  countByGrapheme: true,
  bannedWordFilter: false,
  taxonomy: "entity-topics", // 话题为实体,≤3
  limits: {
    titleMax: 50, // 无官方硬上限,保守 50
    bodyMax: 100000,
    tagsMax: 3,
  },
  publishers: ["assisted", "mock"], // 无官方 API
};
