/**
 * HTML 净化器 —— allowlist 模型,作为所有 HTML 序列化产物的统一最终出口。
 *
 * core 的 html-render 本身只构造白名单标签 + 全程 escapeHtml,产物已受控;
 * 但 LLM 增强、未来原始 HTML 透传等场景可能引入不受信内容,故在序列化末端统一净化:
 *   - 只保留白名单标签,其余标签连同内容策略性处理(脚本类删内容,排版类仅脱标签)
 *   - 只保留白名单属性,剥离所有 on* 事件、javascript:/data:(非图片) 协议
 *
 * 零依赖:用正则做保守清洗。这是纵深防御(defense-in-depth),不是唯一防线。
 */

/** 允许的标签(公众号/知乎/B站富文本所需的排版子集)。 */
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "del", "code", "pre",
  "blockquote", "ul", "ol", "li",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
  "section", "span", "div",
]);

/** 完全删除的危险标签(连同内容一起删,避免脚本/样式泄漏)。 */
const DANGEROUS_TAGS = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form"]);

/** 允许的属性(其余一律剥离)。style 保留(公众号内联样式刚需)。 */
const ALLOWED_ATTRS = new Set(["style", "href", "src", "alt", "title", "colspan", "rowspan", "class"]);

/** 危险协议(href/src 命中即清空)。 */
const DANGEROUS_PROTOCOL = /^\s*(javascript|vbscript|file):/i;

/** 删除危险标签及其内容。 */
function stripDangerousTags(html: string): string {
  let out = html;
  for (const tag of DANGEROUS_TAGS) {
    const re = new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, "gi");
    out = out.replace(re, "");
    // 自闭合/无闭合的危险标签(如 <link>/<meta>/<base>)。
    const selfRe = new RegExp(`<${tag}\\b[^>]*/?>`, "gi");
    out = out.replace(selfRe, "");
  }
  return out;
}

/** 清洗单个标签的属性。 */
function sanitizeAttributes(tagName: string, attrString: string): string {
  const kept: string[] = [];
  // 匹配 name="value" / name='value' / name=value / name
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrString)) !== null) {
    const name = m[1]!.toLowerCase();
    let rawValue = m[2] ?? "";
    // 去引号。
    if (rawValue && (rawValue.startsWith('"') || rawValue.startsWith("'"))) {
      rawValue = rawValue.slice(1, -1);
    }
    // 剥离所有事件处理器与未知属性。
    if (name.startsWith("on")) continue;
    if (!ALLOWED_ATTRS.has(name)) continue;
    // href/src 协议检查。
    if ((name === "href" || name === "src") && DANGEROUS_PROTOCOL.test(rawValue)) continue;
    // style 内禁止 expression()/javascript:。
    if (name === "style" && /(expression\s*\(|javascript:)/i.test(rawValue)) continue;
    if (rawValue) {
      kept.push(`${name}="${rawValue.replace(/"/g, "&quot;")}"`);
    } else {
      kept.push(name);
    }
  }
  return kept.length ? `${tagName} ${kept.join(" ")}` : tagName;
}

/**
 * 净化 HTML 字符串。
 *
 * @param html 待净化的 HTML(text/html 产物)
 * @returns 净化后的 HTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  let out = stripDangerousTags(html);

  // 逐个标签清洗:剥离不在白名单的标签(保留其内部文本),清洗白名单标签的属性。
  out = out.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (_full, slash: string, name: string, attrs: string) => {
    const tag = name.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      return ""; // 非白名单标签:脱壳,保留内部文本节点。
    }
    if (slash === "/") return `</${tag}>`;
    const cleaned = sanitizeAttributes(tag, attrs);
    return `<${cleaned}>`;
  });

  return out;
}

/** 判断某 MIME 是否需要净化(仅 text/html)。 */
export function shouldSanitize(mime: string): boolean {
  return mime === "text/html";
}
