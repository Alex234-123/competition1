import { useEffect, useRef, type ChangeEvent } from "react";
import { listAdapters } from "@mpp/core";
import { useStore } from "./state/store.js";
import { PlatformPreview } from "./components/PlatformPreview.js";
import { renderCoverToDataUrl } from "./render/cover-canvas-renderer.js";
import { buildCoverSpec, markdownToIR } from "@mpp/core";
import type { Draft, HistoryEntry } from "./storage/draft-store.js";

const ADAPTERS = listAdapters();

export function App() {
  const {
    markdown,
    authorName,
    tags,
    selectedPlatforms,
    results,
    publishing,
    receipts,
    setMarkdown,
    setAuthorName,
    setTags,
    togglePlatform,
    insertLocalImage,
    adapt,
    publishAll,
    bridge,
    llm,
    enhance,
    setLlm,
    setEnhance,
    llmReady,
    drafts,
    currentDraftId,
    history,
    loadDrafts,
    newDraft,
    loadDraft,
    saveDraft,
    deleteDraft,
  } = useStore();

  // 首次挂载触发一次适配,并加载已存草稿/历史。
  useEffect(() => {
    adapt();
    void loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 编辑后自动保存草稿(防抖 1.2s),仅当已有 currentDraftId 或内容非空。
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!markdown.trim()) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDraft();
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdown, authorName, tags]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>多平台内容发布工具</h1>
        <p className="subtitle">
          一份 Markdown，自动适配 公众号 / 知乎 / B站 / 小红书，一键发布(默认模拟)
          <span className="env-badge">{bridge?.env === "extension" ? "扩展模式" : "网页模式"}</span>
        </p>
      </header>

      <div className="app-main">
        {/* 左栏:输入 */}
        <section className="input-pane">
          <div className="field">
            <label>作者</label>
            <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          </div>
          <div className="field">
            <label>标签(逗号分隔)</label>
            <input
              value={tags.join(", ")}
              onChange={(e) => setTags(e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean))}
            />
          </div>
          <div className="field field-grow">
            <label>Markdown 内容</label>
            <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} spellCheck={false} />
          </div>

          <LocalImagePicker onPick={insertLocalImage} />

          <DraftsPanel
            drafts={drafts}
            currentDraftId={currentDraftId}
            onNew={() => void newDraft()}
            onLoad={(id) => void loadDraft(id)}
            onDelete={(id) => void deleteDraft(id)}
          />

          <div className="platform-toggles">
            {ADAPTERS.map((a) => (
              <label key={a.id} className={selectedPlatforms.includes(a.id) ? "chip active" : "chip"}>
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(a.id)}
                  onChange={() => togglePlatform(a.id)}
                />
                {a.name}
              </label>
            ))}
          </div>

          <CoverPreview markdown={markdown} authorName={authorName} tags={tags} />

          <SettingsPanel
            llm={llm}
            enhance={enhance}
            ready={llmReady()}
            onLlm={setLlm}
            onEnhance={setEnhance}
          />

          <button className="publish-btn" disabled={publishing} onClick={() => publishAll()}>
            {publishing ? "发布中…" : llmReady() && (enhance.title || enhance.summary || enhance.colloquialize) ? "AI 增强并一键模拟发布" : "一键模拟发布"}
          </button>
        </section>

        {/* 右栏:四平台预览 */}
        <section className="preview-pane">
          {results.length === 0 && <div className="preview-placeholder">在左侧输入内容,这里实时显示各平台适配效果</div>}
          <div className="preview-grid">
            {results.map((r) => (
              <div key={r.platformId} className="preview-cell">
                <PlatformPreview result={r} />
                {receipts[r.platformId] && <div className="receipt">📮 {receipts[r.platformId]}</div>}
              </div>
            ))}
          </div>

          <HistoryPanel history={history} />
        </section>
      </div>
    </div>
  );
}

// 本地图片选择器:选图 → FileReader 转 dataURL → 插入正文(走 rehost 链路)。
function LocalImagePicker({ onPick }: { onPick: (dataUrl: string, alt: string) => void }) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (dataUrl) onPick(dataUrl, file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // 允许重复选同一文件。
  };
  return (
    <div className="image-picker">
      <label className="image-picker-btn">
        + 插入本地图片
        <input type="file" accept="image/*" onChange={onChange} hidden />
      </label>
      <span className="image-picker-hint">本地图发布时自动上传图床并替换为外链</span>
    </div>
  );
}

// 草稿面板:新建 + 列表(加载/删除)。编辑自动保存,刷新后仍在。
function DraftsPanel({
  drafts,
  currentDraftId,
  onNew,
  onLoad,
  onDelete,
}: {
  drafts: Draft[];
  currentDraftId: string | null;
  onNew: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <details className="drafts-panel" open={drafts.length > 0}>
      <summary>草稿({drafts.length})</summary>
      <button className="draft-new-btn" onClick={onNew}>
        + 新建草稿
      </button>
      {drafts.length === 0 ? (
        <div className="drafts-empty">编辑内容会自动存为草稿,刷新不丢失。</div>
      ) : (
        <ul className="drafts-list">
          {drafts.map((d) => (
            <li key={d.id} className={d.id === currentDraftId ? "draft-item active" : "draft-item"}>
              <button className="draft-open" onClick={() => onLoad(d.id)} title={d.title}>
                <span className="draft-title">{d.title || "未命名草稿"}</span>
                <span className="draft-time">{formatTime(d.updatedAt)}</span>
              </button>
              <button className="draft-del" onClick={() => onDelete(d.id)} title="删除">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

// 发布历史面板:每次发布后追加一条(时间/各平台状态)。
function HistoryPanel({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return null;
  return (
    <details className="history-panel" open>
      <summary>发布历史({history.length})</summary>
      <ul className="history-list">
        {history.map((h) => (
          <li key={h.id} className="history-item">
            <div className="history-head">
              <span className="history-title">{h.draftTitle}</span>
              <span className="history-time">{formatTime(h.at)}</span>
            </div>
            <div className="history-platforms">
              {h.platforms.map((p) => (
                <span key={p.platformId} className={p.ok ? "history-badge ok" : "history-badge fail"} title={p.message}>
                  {p.platformId} {p.ok ? "✓" : "✕"}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

// 友好时间:今天显示 HH:MM,否则 MM-DD HH:MM。
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return sameDay ? hm : `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`;
}

// 设置面板:LLM 配置(OpenAI 兼容)+ AI 增强开关。apiKey 仅存本地。
function SettingsPanel({
  llm,
  enhance,
  ready,
  onLlm,
  onEnhance,
}: {
  llm: { baseUrl: string; apiKey: string; model: string };
  enhance: { title?: boolean; summary?: boolean; colloquialize?: boolean };
  ready: boolean;
  onLlm: (patch: Partial<{ baseUrl: string; apiKey: string; model: string }>) => void;
  onEnhance: (patch: Partial<{ title?: boolean; summary?: boolean; colloquialize?: boolean }>) => void;
}) {
  return (
    <details className="settings-panel">
      <summary>AI 风格优化(可选,OpenAI 兼容){ready ? " ✓ 已配置" : " — 未配置"}</summary>
      <div className="field">
        <label>API 基址(到 /v1)</label>
        <input
          value={llm.baseUrl}
          placeholder="https://api.deepseek.com/v1"
          onChange={(e) => onLlm({ baseUrl: e.target.value })}
        />
      </div>
      <div className="field">
        <label>API Key(仅存本地,不入库)</label>
        <input type="password" value={llm.apiKey} placeholder="sk-..." onChange={(e) => onLlm({ apiKey: e.target.value })} />
      </div>
      <div className="field">
        <label>模型</label>
        <input value={llm.model} placeholder="deepseek-chat" onChange={(e) => onLlm({ model: e.target.value })} />
      </div>
      <div className="ai-actions">
        <label className="ai-btn" style={{ opacity: ready ? 1 : 0.5 }}>
          <input
            type="checkbox"
            disabled={!ready}
            checked={!!enhance.title}
            onChange={(e) => onEnhance({ title: e.target.checked })}
          />{" "}
          优化标题
        </label>
        <label className="ai-btn" style={{ opacity: ready ? 1 : 0.5 }}>
          <input
            type="checkbox"
            disabled={!ready}
            checked={!!enhance.summary}
            onChange={(e) => onEnhance({ summary: e.target.checked })}
          />{" "}
          生成摘要
        </label>
        <label className="ai-btn" style={{ opacity: ready ? 1 : 0.5 }}>
          <input
            type="checkbox"
            disabled={!ready}
            checked={!!enhance.colloquialize}
            onChange={(e) => onEnhance({ colloquialize: e.target.checked })}
          />{" "}
          口语化(小红书)
        </label>
      </div>
      {!ready && <div className="ai-status">填入 API Key 后启用;无 key 时规则式适配仍完整可用。</div>}
    </details>
  );
}

// 小红书封面卡片预览(Canvas 生成)。
function CoverPreview({ markdown, authorName, tags }: { markdown: string; authorName: string; tags: string[] }) {
  const { document } = markdownToIR(markdown, { meta: { authorName, tags } });
  const spec = buildCoverSpec(document, { ratio: "3:4" });
  let dataUrl = "";
  try {
    dataUrl = renderCoverToDataUrl(spec);
  } catch {
    dataUrl = "";
  }
  if (!dataUrl) return null;
  return (
    <div className="cover-preview">
      <label>自动生成封面(小红书 3:4)</label>
      <img src={dataUrl} alt="封面" />
      <a className="cover-download" href={dataUrl} download="cover.png">
        下载封面 PNG
      </a>
    </div>
  );
}
