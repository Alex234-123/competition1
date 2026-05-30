/**
 * 字素簇计数 —— 小红书标题≤20/正文≤1000 的判定基础。
 *
 * 为什么不用 string.length:JS 字符串按 UTF-16 码元计数,emoji(尤其 ZWJ 组合,
 * 如 👨‍👩‍👧)、部分中文会被算多。必须按"用户感知字符"(grapheme cluster)计数。
 * 优先用 Intl.Segmenter(Node 16+/现代浏览器),不可用时退化为码点计数([...str])。
 */

let segmenter: Intl.Segmenter | undefined;
let segmenterChecked = false;

function getSegmenter(): Intl.Segmenter | undefined {
  if (!segmenterChecked) {
    segmenterChecked = true;
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      segmenter = new Intl.Segmenter("zh", { granularity: "grapheme" });
    }
  }
  return segmenter;
}

/** 按字素簇计算可见字符数。 */
export function graphemeCount(input: string): number {
  const seg = getSegmenter();
  if (seg) {
    let n = 0;
    for (const _ of seg.segment(input)) n++;
    return n;
  }
  // 退化:按 Unicode 码点计数,优于 UTF-16 码元。
  return [...input].length;
}

/** 按字素簇截断到 max 个字符(用于硬性长度约束)。 */
export function graphemeTruncate(input: string, max: number): string {
  if (max <= 0) return "";
  const seg = getSegmenter();
  if (seg) {
    let out = "";
    let n = 0;
    for (const { segment } of seg.segment(input)) {
      if (n >= max) break;
      out += segment;
      n++;
    }
    return out;
  }
  return [...input].slice(0, max).join("");
}
