import { type ChangeEvent, useMemo } from "react";
import { ImagePlus, Download } from "lucide-react";
import { buildCoverSpec, markdownToIR } from "@mpp/core";
import { renderCoverToDataUrl } from "../render/cover-canvas-renderer.js";
import { platformColor } from "./platform-meta.js";

interface Adapter {
  id: string;
  name: string;
}

/** 本地图片选择器:选图 → FileReader 转 dataURL → 回调插入正文。 */
export function ImagePicker({ onPick }: { onPick: (dataUrl: string, alt: string) => void }) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (dataUrl) onPick(dataUrl, file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <label className="btn">
      <ImagePlus size={16} aria-hidden />
      插入本地图片
      <input type="file" accept="image/*" onChange={onChange} hidden />
    </label>
  );
}

/** 平台多选 chip 行。 */
export function PlatformChips({
  adapters,
  selected,
  onToggle,
}: {
  adapters: readonly Adapter[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="platform-toggles" role="group" aria-label="选择目标平台">
      {adapters.map((a) => {
        const active = selected.includes(a.id);
        return (
          <label
            key={a.id}
            className={active ? "chip active" : "chip"}
            style={{ ["--chip-color" as string]: platformColor(a.id) }}
          >
            <input type="checkbox" checked={active} onChange={() => onToggle(a.id)} />
            <span className="chip-dot" aria-hidden />
            {a.name}
          </label>
        );
      })}
    </div>
  );
}

/** 小红书封面卡片预览(Canvas 生成)。 */
export function CoverPreview({
  markdown,
  authorName,
  tags,
}: {
  markdown: string;
  authorName: string;
  tags: string[];
}) {
  const tagsKey = tags.join("");
  const dataUrl = useMemo(() => {
    try {
      const { document } = markdownToIR(markdown, { meta: { authorName, tags } });
      const spec = buildCoverSpec(document, { ratio: "3:4" });
      return renderCoverToDataUrl(spec);
    } catch {
      return "";
    }
    // tags 用 tagsKey 派生稳定依赖,避免数组每次新引用导致缓存失效。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdown, authorName, tagsKey]);
  if (!dataUrl) return null;
  return (
    <div className="cover-preview">
      <img src={dataUrl} alt="自动生成的小红书封面预览" />
      <div className="cover-preview-info">
        <span className="cover-preview-title">自动封面 · 小红书 3:4</span>
        <a className="btn btn-ghost btn-sm" href={dataUrl} download="cover.png">
          <Download size={14} aria-hidden />
          下载 PNG
        </a>
      </div>
    </div>
  );
}
