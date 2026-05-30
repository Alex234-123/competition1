/**
 * 封面 Canvas 渲染器 —— 把 core 的 CoverSpec 用浏览器 Canvas 落地为 PNG。
 *
 * 浏览器端零依赖;中文一致性依赖系统字体(演示足够)。返回 dataURL 供预览/下载。
 */
import type { CoverSpec } from "@mpp/core";

export function renderCoverToDataUrl(spec: CoverSpec): string {
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 背景。
  ctx.fillStyle = spec.background;
  ctx.fillRect(0, 0, spec.width, spec.height);

  // 顶部强调色条。
  ctx.fillStyle = spec.accent;
  ctx.fillRect(0, 0, spec.width, Math.max(8, Math.floor(spec.height * 0.02)));

  // 左侧强调竖条。
  ctx.fillRect(0, 0, Math.max(8, Math.floor(spec.width * 0.012)), spec.height);

  // 标题(自动换行,居中)。
  const fontSize = Math.floor(spec.width / 11);
  ctx.fillStyle = spec.textColor;
  ctx.font = `bold ${fontSize}px "PingFang SC","Microsoft YaHei",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = spec.width * 0.82;
  const lines = wrapByWidth(ctx, spec.title, maxWidth);
  const lineHeight = fontSize * 1.35;
  const startY = spec.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, spec.width / 2, startY + i * lineHeight);
  });

  // 副标题。
  if (spec.subtitle) {
    ctx.font = `${Math.floor(fontSize * 0.5)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillStyle = "#888888";
    ctx.fillText(spec.subtitle, spec.width / 2, startY + lines.length * lineHeight + fontSize * 0.4);
  }

  return canvas.toDataURL("image/png");
}

function wrapByWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = [...text];
  const lines: string[] = [];
  let current = "";
  for (const ch of chars) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
