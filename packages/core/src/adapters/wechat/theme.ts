/**
 * 公众号视觉主题 —— 内联样式表。
 *
 * 关键约束:公众号过滤 <style> 块/外链 CSS/class/id,所有样式必须 inline。
 * 这里把调研得出的移动端排版规范固化为每种标签的内联 style 字符串:
 * 正文 16px、行高 1.75、字间距 0.5px、段间距用 margin、≤3 色。
 */
export interface WechatTheme {
  readonly id: string;
  readonly name: string;
  readonly accent: string;
  readonly styleFor: (tag: string) => string;
}

/** 极简主题(当前流行)。 */
export function createMinimalTheme(accent = "#07C160"): WechatTheme {
  const body = "font-size:16px;line-height:1.75;letter-spacing:0.5px;color:#222222;";
  const styles: Record<string, string> = {
    p: `margin:0 0 1.2em 0;${body}`,
    h1: "font-size:22px;font-weight:bold;line-height:1.4;margin:1.5em 0 0.8em 0;color:#222222;",
    h2: `font-size:19px;font-weight:bold;line-height:1.4;margin:1.4em 0 0.7em 0;color:#222222;border-left:4px solid ${accent};padding-left:10px;`,
    h3: "font-size:17px;font-weight:bold;line-height:1.4;margin:1.2em 0 0.6em 0;color:#222222;",
    h4: "font-size:16px;font-weight:bold;margin:1em 0 0.5em 0;color:#444444;",
    h5: "font-size:16px;font-weight:bold;margin:1em 0 0.5em 0;color:#444444;",
    h6: "font-size:16px;font-weight:bold;margin:1em 0 0.5em 0;color:#666666;",
    ul: `margin:0 0 1.2em 0;padding-left:1.4em;${body}`,
    ol: `margin:0 0 1.2em 0;padding-left:1.4em;${body}`,
    li: "margin:0 0 0.5em 0;",
    blockquote: `margin:0 0 1.2em 0;padding:10px 14px;background:#f7f7f7;border-left:3px solid ${accent};color:#666666;${body}`,
    pre: "margin:0 0 1.2em 0;padding:12px;background:#f6f8fa;border-radius:6px;overflow-x:auto;font-size:14px;line-height:1.5;",
    codeInline: "background:#f6f8fa;padding:2px 4px;border-radius:3px;font-size:14px;color:#c7254e;",
    strong: "font-weight:bold;color:#222222;",
    em: "font-style:italic;",
    a: `color:${accent};text-decoration:none;`,
    img: "max-width:100%;border-radius:6px;display:block;margin:0 auto 1.2em auto;",
    figure: "margin:0 0 1.2em 0;text-align:center;",
    figcaption: "font-size:13px;color:#999999;margin-top:6px;",
    hr: "border:none;border-top:1px solid #eeeeee;margin:1.5em 0;",
    table: "width:100%;border-collapse:collapse;margin:0 0 1.2em 0;font-size:14px;",
    th: "border:1px solid #ddd;padding:8px;background:#f7f7f7;font-weight:bold;",
    td: "border:1px solid #ddd;padding:8px;",
    footnote: "font-size:13px;color:#999999;margin:0.3em 0;line-height:1.6;",
  };
  return {
    id: "minimal",
    name: "极简",
    accent,
    styleFor: (tag) => styles[tag] ?? "",
  };
}

/** 把内容包进一个带左右内边距的容器(模拟公众号 16px 侧边距)。 */
export function wrapWechatContainer(innerHtml: string): string {
  return `<section style="padding:0 16px;max-width:677px;margin:0 auto;font-size:16px;color:#222222;">${innerHtml}</section>`;
}
