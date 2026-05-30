/** markdown-it 实例配置。集中配置选项与插件,供 md-to-ir 使用。 */
import MarkdownIt from "markdown-it";

/**
 * 创建配置好的 markdown-it 实例。
 *
 * - html:false —— 不直接透传原始 HTML(IR 应表达语义,而非平台样式)。
 * - linkify:true —— 自动识别裸 URL。
 * - typographer:false —— 保留原始标点,避免中文场景的意外替换。
 */
export function createMarkdownParser(): MarkdownIt {
  return new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
    breaks: false,
  });
}
