/**
 * IR(Intermediate Representation)契约。
 *
 * 这是整个工具的核心:所有平台共享同一份规范化内容模型,各平台适配器在"晚期"
 * 把 IR 序列化成自己的原生格式(公众号内联 HTML / 知乎富文本 / B站受限 HTML / 小红书纯文本)。
 * 核心永远不持有任何平台的 HTML —— 它只持有 AST + 元数据 + 资产表。
 */

// ---------------------------------------------------------------------------
// 行内(Inline)模型 —— 语义化,绝不携带 CSS
// ---------------------------------------------------------------------------

export type Inline =
  | TextInline
  | StrongInline
  | EmInline
  | CodeInline
  | LinkInline
  | InlineMath
  | EmojiInline
  | LineBreakInline;

export interface TextInline {
  readonly type: "text";
  readonly value: string;
}

export interface StrongInline {
  readonly type: "strong";
  readonly children: readonly Inline[];
}

export interface EmInline {
  readonly type: "em";
  readonly children: readonly Inline[];
}

export interface CodeInline {
  readonly type: "code";
  readonly value: string;
}

export interface LinkInline {
  readonly type: "link";
  readonly href: string;
  readonly children: readonly Inline[];
}

export interface InlineMath {
  readonly type: "inlineMath";
  readonly tex: string;
}

/** Unicode emoji 或平台短码(如 :smile:),计数时按字素簇处理。 */
export interface EmojiInline {
  readonly type: "emoji";
  readonly value: string;
}

export interface LineBreakInline {
  readonly type: "lineBreak";
}

// ---------------------------------------------------------------------------
// 块(Block)模型 —— 表达意图(heading/list/quote),而非样式
// ---------------------------------------------------------------------------

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | QuoteBlock
  | CodeBlock
  | ImageBlock
  | TableBlock
  | MathBlock
  | DividerBlock
  | EmbedBlock
  | FootnoteBlock;

export interface HeadingBlock {
  readonly type: "heading";
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly inlines: readonly Inline[];
}

export interface ParagraphBlock {
  readonly type: "paragraph";
  readonly inlines: readonly Inline[];
}

export interface ListBlock {
  readonly type: "list";
  readonly ordered: boolean;
  /** 每个列表项是一组块(支持嵌套列表/多段)。 */
  readonly items: readonly (readonly Block[])[];
}

export interface QuoteBlock {
  readonly type: "quote";
  readonly blocks: readonly Block[];
}

export interface CodeBlock {
  readonly type: "codeBlock";
  readonly lang?: string;
  readonly text: string;
}

/** 图片块,通过 assetId 引用资产表 —— 绝不内联 URL(各平台需分别重托管)。 */
export interface ImageBlock {
  readonly type: "image";
  readonly assetId: string;
  readonly alt?: string;
  readonly caption?: string;
}

export interface TableBlock {
  readonly type: "table";
  readonly header: readonly (readonly Inline[])[];
  readonly rows: readonly (readonly (readonly Inline[])[])[];
}

export interface MathBlock {
  readonly type: "math";
  readonly tex: string;
}

export interface DividerBlock {
  readonly type: "divider";
}

/** 音视频/iframe 等富嵌入;各平台 capability 决定映射或丢弃。 */
export interface EmbedBlock {
  readonly type: "embed";
  readonly kind: "audio" | "video" | "iframe";
  readonly assetId?: string;
  readonly src?: string;
}

/** 脚注定义块(外链→脚注降级的落点)。 */
export interface FootnoteBlock {
  readonly type: "footnote";
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

// ---------------------------------------------------------------------------
// 资产(Asset)—— 一等公民,按 (assetId, platform) 维度记录重托管结果
// ---------------------------------------------------------------------------

export type AssetKind = "image" | "video" | "audio";

export interface AssetSource {
  /** 原始来源:外链 URL、本地路径或内联 data URL。 */
  readonly url?: string;
  readonly localPath?: string;
  readonly dataUrl?: string;
  /** 是否由变换生成的占位/平台原生资产(表格图/公式图)。为 true 时跳过图床重托管。 */
  readonly generated?: boolean;
}

/** 某平台重托管后的结果(公众号 mp URL / B站 hdslb URL / media_id 等)。 */
export interface RehostRecord {
  readonly url?: string;
  readonly mediaId?: string;
}

export interface Asset {
  readonly id: string;
  readonly kind: AssetKind;
  readonly source: AssetSource;
  readonly mime?: string;
  readonly width?: number;
  readonly height?: number;
  readonly bytes?: number;
  /** platformId -> 该平台的重托管结果。绝不跨平台共享。 */
  readonly rehosted: Readonly<Record<string, RehostRecord>>;
}

// ---------------------------------------------------------------------------
// 文档元数据与平台覆盖层
// ---------------------------------------------------------------------------

export interface DocumentMeta {
  readonly title: string;
  readonly subtitle?: string;
  readonly authorName?: string;
  /** 规范摘要;各适配器据此派生 digest / 推荐语。 */
  readonly summary?: string;
  /** 逻辑封面资产 id;各适配器按平台比例重裁。 */
  readonly coverAssetId?: string;
  /** 自由文本标签;各适配器映射到平台话题体系。 */
  readonly tags: readonly string[];
  /** 话题意图,区别于自由标签。 */
  readonly topics?: readonly string[];
  /** 规范链接,成为公众号 content_source_url / "阅读原文"。 */
  readonly canonicalUrl?: string;
  readonly lang: "zh" | "en";
}

/** OpenWrite 式的每平台覆盖层 —— 携带平台特定字段,核心 schema 无需变动。 */
export interface PlatformOverride {
  readonly title?: string;
  readonly summary?: string;
  readonly tags?: readonly string[];
  /** B站 tid / 分区,或其它平台的分类。 */
  readonly category?: string;
  readonly coverAssetId?: string;
  /** 公众号排版主题 id 等。 */
  readonly themeId?: string;
  /** 未建模的平台特定字段。 */
  readonly extra?: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// 文档 —— 核心持有的全部内容
// ---------------------------------------------------------------------------

export interface Document {
  readonly meta: DocumentMeta;
  readonly blocks: readonly Block[];
  readonly assets: readonly Asset[];
  readonly overrides: Readonly<Record<string, PlatformOverride>>;
}

// ---------------------------------------------------------------------------
// 能力声明 —— 适配器声明它"支持/缺少"什么,核心据此驱动降级变换
// ---------------------------------------------------------------------------

export type ContentModel =
  | "inline-html" // 公众号:全内联样式 HTML
  | "rich-clipboard" // 知乎:可粘贴富文本
  | "restricted-html" // B站:受限 HTML 子集
  | "markdown" // 通用 Markdown 原生(如掘金)
  | "plaintext"; // 小红书:纯文本 + emoji + #话题#

export type FeatureSupport = "native" | "image" | "text" | "none";

export type Taxonomy = "free-tags" | "entity-topics" | "category+tags";

/** 发布器种类:模拟、辅助交接、cookie 会话(非官方)、官方 API。 */
export type PublisherKind = "mock" | "assisted" | "cookie" | "official";

export interface PlatformLimits {
  readonly titleMax?: number;
  readonly bodyMax?: number;
  readonly summaryMax?: number;
  readonly tagsMax?: number;
  readonly authorMax?: number;
  /** 图片张数上限(小红书 9)。 */
  readonly maxImages?: number;
}

export interface Capabilities {
  readonly contentModel: ContentModel;
  readonly supportsExternalLinks: boolean;
  readonly supportsTables: boolean;
  readonly supportsMath: FeatureSupport;
  readonly supportsCodeBlocks: FeatureSupport;
  /** 是否必须封面(小红书必须有图)。 */
  readonly requiresCover: boolean;
  /** 是否需要把正文图片重托管到平台自有图床。 */
  readonly requiresImageRehost: boolean;
  /** 字数是否按字素簇计数(中文/emoji 平台为 true)。 */
  readonly countByGrapheme: boolean;
  /** 是否过滤违禁词(小红书)。 */
  readonly bannedWordFilter: boolean;
  readonly taxonomy: Taxonomy;
  readonly limits: PlatformLimits;
  /** 该平台支持的发布器种类,按优先级排列。 */
  readonly publishers: readonly PublisherKind[];
}
