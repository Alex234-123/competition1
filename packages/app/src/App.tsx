import { useEffect, useRef, useState } from "react";
import { listAdapters } from "@mpp/core";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useShallow } from "zustand/react/shallow";
import { Loader2, Send, Sparkles, Check, Inbox } from "lucide-react";
import { useStore } from "./state/store.js";
import { useTheme } from "./styles/use-theme.js";
import { Toolbar } from "./components/Toolbar.js";
import { PlatformPreview } from "./components/PlatformPreview.js";
import { ImagePicker, PlatformChips, CoverPreview } from "./components/EditorExtras.js";
import { SettingsDrawer } from "./components/SettingsDrawer.js";
import { DraftsDrawer } from "./components/DraftsDrawer.js";

const ADAPTERS = listAdapters();

export function App() {
  // 分片选择器订阅:按字段取值,避免任一 state 变化重渲染整棵树。
  const markdown = useStore((s) => s.markdown);
  const authorName = useStore((s) => s.authorName);
  const tags = useStore((s) => s.tags);
  const selectedPlatforms = useStore((s) => s.selectedPlatforms);
  const results = useStore((s) => s.results);
  const receipts = useStore((s) => s.receipts);
  const publishing = useStore((s) => s.publishing);
  const drafts = useStore((s) => s.drafts);
  const currentDraftId = useStore((s) => s.currentDraftId);
  const history = useStore((s) => s.history);
  const llm = useStore((s) => s.llm);
  const enhance = useStore((s) => s.enhance);
  const serverUrl = useStore((s) => s.serverUrl);
  const bridge = useStore((s) => s.bridge);
  const env = useStore((s) => s.bridge?.env);
  // 行为(action)引用恒定,用 useShallow 一次性取出,不引入额外渲染。
  const actions = useStore(
    useShallow((s) => ({
      setMarkdown: s.setMarkdown,
      setAuthorName: s.setAuthorName,
      setTags: s.setTags,
      togglePlatform: s.togglePlatform,
      insertLocalImage: s.insertLocalImage,
      setLlm: s.setLlm,
      setEnhance: s.setEnhance,
      setServerUrl: s.setServerUrl,
      llmReady: s.llmReady,
      adapt: s.adapt,
      publishAll: s.publishAll,
      loadDrafts: s.loadDrafts,
      newDraft: s.newDraft,
      loadDraft: s.loadDraft,
      saveDraft: s.saveDraft,
      deleteDraft: s.deleteDraft,
    })),
  );

  const { mode, cycle } = useTheme();
  const [previewOnly, setPreviewOnly] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 首次挂载触发一次适配,并加载已存草稿/历史。
  useEffect(() => {
    actions.adapt();
    void actions.loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 编辑后自动保存草稿(防抖 1.2s)。
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!markdown.trim()) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void actions.saveDraft(), 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdown, authorName, tags]);

  const ready = actions.llmReady();
  const aiEnabled = ready && (enhance.title || enhance.summary || enhance.colloquialize || enhance.rewrite);

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="app">
        <Toolbar
          env={env}
          themeMode={mode}
          onCycleTheme={cycle}
          previewOnly={previewOnly}
          onTogglePreviewOnly={() => setPreviewOnly((v) => !v)}
          draftCount={drafts.length}
          onOpenDrafts={() => setDraftsOpen(true)}
          llmReady={ready}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className={previewOnly ? "workspace preview-only" : "workspace"}>
          {/* 左栏:编辑 */}
          <section className="editor-pane" aria-label="编辑区">
            <div className="editor-meta">
              <label className="field">
                <span className="field-label">作者</span>
                <input
                  className="field-input"
                  value={authorName}
                  onChange={(e) => actions.setAuthorName(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">标签（逗号分隔）</span>
                <input
                  className="field-input"
                  value={tags.join(", ")}
                  onChange={(e) =>
                    actions.setTags(
                      e.target.value
                        .split(/[,，]/)
                        .map((x) => x.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </label>
            </div>

            <div className="editor-subtoolbar">
              <span className="editor-subtoolbar-label">Markdown 内容</span>
              <ImagePicker onPick={actions.insertLocalImage} />
            </div>

            <div className="editor-body">
              <textarea
                className="editor-textarea"
                value={markdown}
                onChange={(e) => actions.setMarkdown(e.target.value)}
                spellCheck={false}
                placeholder="# 在这里输入标题&#10;&#10;正文支持 Markdown，左侧编辑、右侧实时预览四平台适配效果……"
                aria-label="Markdown 内容"
              />
            </div>

            <div className="editor-extras">
              <PlatformChips
                adapters={ADAPTERS}
                selected={selectedPlatforms}
                onToggle={actions.togglePlatform}
              />
              <CoverPreview markdown={markdown} authorName={authorName} tags={tags} />
            </div>

            <div className="editor-footer">
              <button className="btn btn-primary btn-lg" disabled={publishing} onClick={() => actions.publishAll()}>
                {publishing ? (
                  <>
                    <Loader2 size={18} className="spinner" aria-hidden />
                    发布中…
                  </>
                ) : aiEnabled ? (
                  <>
                    <Sparkles size={18} aria-hidden />
                    AI 增强并一键模拟发布
                  </>
                ) : (
                  <>
                    <Send size={18} aria-hidden />
                    一键模拟发布
                  </>
                )}
              </button>
            </div>
          </section>

          {/* 右栏:四平台预览 */}
          <section className="preview-pane" aria-label="预览区">
            {results.length === 0 ? (
              <div className="preview-placeholder">
                <span className="preview-placeholder-icon" aria-hidden>
                  <Inbox size={30} />
                </span>
                <span className="preview-placeholder-title">实时多平台预览</span>
                <span className="preview-placeholder-hint">
                  在左侧输入 Markdown，这里会实时显示公众号 / 知乎 / B站 / 小红书的适配效果与校验结果。
                </span>
              </div>
            ) : (
              <div className="preview-grid">
                {results.map((r) => (
                  <div key={r.platformId} className="preview-cell">
                    <PlatformPreview result={r} bridge={bridge} />
                    {receipts[r.platformId] && (
                      <div className="receipt">
                        <Check size={14} aria-hidden />
                        {receipts[r.platformId]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <SettingsDrawer
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          llm={llm}
          enhance={enhance}
          ready={ready}
          serverUrl={serverUrl}
          onLlm={actions.setLlm}
          onEnhance={actions.setEnhance}
          onServerUrl={actions.setServerUrl}
        />
        <DraftsDrawer
          open={draftsOpen}
          onOpenChange={setDraftsOpen}
          drafts={drafts}
          currentDraftId={currentDraftId}
          history={history}
          onNew={() => {
            void actions.newDraft();
            setDraftsOpen(false);
          }}
          onLoad={(id) => {
            void actions.loadDraft(id);
            setDraftsOpen(false);
          }}
          onDelete={(id) => void actions.deleteDraft(id)}
        />
      </div>
    </Tooltip.Provider>
  );
}
