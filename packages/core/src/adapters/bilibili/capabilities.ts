/** B站专栏能力声明。 */
import type { Capabilities } from "../../ir/types.js";

export const bilibiliCapabilities: Capabilities = {
  contentModel: "restricted-html", // 受限 HTML 子集
  supportsExternalLinks: true, // 站内链接可,外链弱,这里保留由序列化处理
  supportsTables: false, // 表格渲染差 → 转图片
  supportsMath: "image", // 公式 → 图片
  supportsCodeBlocks: "image", // 代码块建议转图片(此处保留为 pre,序列化加提示)
  requiresCover: true, // 头图(banner_url)对分发关键
  requiresImageRehost: true, // 防盗链 → 必须重托管到 hdslb
  countByGrapheme: true,
  bannedWordFilter: false,
  taxonomy: "category+tags", // 分区 + 标签
  limits: {
    titleMax: 40, // 设计上限 40 字
    bodyMax: 40000, // 计数器 40001 变红
    tagsMax: 10,
  },
  publishers: ["assisted", "mock"], // 无官方专栏 API
};
