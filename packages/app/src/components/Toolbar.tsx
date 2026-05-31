import { FileText, Settings2, PanelRightClose, PanelRightOpen, Send } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ThemeToggle } from "./ThemeToggle.js";
import type { ThemeMode } from "../styles/use-theme.js";

interface Props {
  env: "web" | "extension" | undefined;
  themeMode: ThemeMode;
  onCycleTheme: () => void;
  previewOnly: boolean;
  onTogglePreviewOnly: () => void;
  draftCount: number;
  onOpenDrafts: () => void;
  llmReady: boolean;
  onOpenSettings: () => void;
}

function IconBtn({
  label,
  active,
  pressed,
  haspopup,
  onClick,
  children,
}: {
  label: string;
  /** 视觉高亮(不影响语义)。 */
  active?: boolean;
  /** 双态切换按钮:映射到 aria-pressed。 */
  pressed?: boolean;
  /** 打开对话框的按钮:映射到 aria-haspopup="dialog"。 */
  haspopup?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className={active ? "btn-icon active" : "btn-icon"}
          onClick={onClick}
          aria-label={label}
          aria-pressed={pressed}
          aria-haspopup={haspopup ? "dialog" : undefined}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" sideOffset={6}>
          {label}
          <Tooltip.Arrow className="tooltip-arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** 顶部工具栏:品牌标识 + 全局操作(草稿/设置/全屏预览/主题)。 */
export function Toolbar({
  env,
  themeMode,
  onCycleTheme,
  previewOnly,
  onTogglePreviewOnly,
  draftCount,
  onOpenDrafts,
  llmReady,
  onOpenSettings,
}: Props) {
  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="toolbar-logo" aria-hidden>
          <Send size={16} />
        </span>
        <span className="toolbar-title">
          多平台内容发布工具
          <span className="toolbar-title-sub">一份 Markdown，自动适配四平台</span>
        </span>
        <span className="env-badge">{env === "extension" ? "扩展模式" : "网页模式"}</span>
      </div>

      <div className="toolbar-actions">
        <IconBtn label={`草稿与历史（${draftCount}）`} haspopup onClick={onOpenDrafts}>
          <FileText size={18} aria-hidden />
        </IconBtn>
        <IconBtn
          label={llmReady ? "AI 设置（已配置）" : "AI 设置（未配置）"}
          active={llmReady}
          haspopup
          onClick={onOpenSettings}
        >
          <Settings2 size={18} aria-hidden />
        </IconBtn>
        <IconBtn
          label={previewOnly ? "显示编辑栏" : "全屏预览"}
          active={previewOnly}
          pressed={previewOnly}
          onClick={onTogglePreviewOnly}
        >
          {previewOnly ? <PanelRightOpen size={18} aria-hidden /> : <PanelRightClose size={18} aria-hidden />}
        </IconBtn>
        <ThemeToggle mode={themeMode} onCycle={onCycleTheme} />
      </div>
    </header>
  );
}
