/** 各平台发布指引文案 —— stage 阶段附给用户的人类可读步骤。 */

const INSTRUCTIONS: Record<string, readonly string[]> = {
  wechat: [
    "默认走模拟发布;真实发布需配置公众号 AppID/Secret 并启动本地 server。",
    "真实发布会调用官方草稿接口 draft/add,文章进入草稿箱,需在后台人工确认群发。",
    "注意:话题标签无法经 API 设置,请在后台手动添加(原创文章最多 5 个)。",
    "正文外链图片会被过滤,server 会自动重托管到 media/uploadimg。",
  ],
  zhihu: [
    "知乎无官方发布 API,采用复制富文本→粘贴的辅助方式。",
    "点击「复制富文本」,然后到知乎「写文章」编辑器 Ctrl+V 粘贴。",
    "公式已转为知乎 equation 图片;表格已转为 HTML 表格。",
    "话题需在发布对话框确认为知乎实体话题(最多 3 个)。",
  ],
  bilibili: [
    "B站专栏无官方 API,采用复制粘贴/辅助注入方式。",
    "图片防盗链:外链图片会被过滤,需先启动本地 server 配置图床后重试;预览时可忽略此警告。",
    "代码块与表格已转为图片占位;头图(≥640px,约 3:2)对分发关键,请确认封面。",
    "注意:专栏内部接口非官方,自动化有 ToS/封号风险,推荐人工粘贴。",
  ],
  xiaohongshu: [
    "小红书无自助发布 API,采用复制文案 + 上传图片的辅助方式。",
    "正文为纯文本 + emoji + #话题#;必须有图,已据标题生成封面卡片。",
    "标题已压缩到 ≤20 字、正文 ≤1000 字;超出部分建议做成图片卡片。",
    "已过滤极限/违禁词以保护流量。",
  ],
};

const DEFAULT_INSTRUCTIONS: readonly string[] = [
  "默认走模拟发布;产物可导出或复制粘贴到目标平台编辑器。",
];

export function instructionsFor(platformId: string): readonly string[] {
  return INSTRUCTIONS[platformId] ?? DEFAULT_INSTRUCTIONS;
}
