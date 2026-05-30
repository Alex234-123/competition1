import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import { X, Sparkles, KeyRound } from "lucide-react";
import type { EnhanceOptions } from "@mpp/core";

interface LlmSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  llm: LlmSettings;
  enhance: EnhanceOptions;
  ready: boolean;
  onLlm: (patch: Partial<LlmSettings>) => void;
  onEnhance: (patch: Partial<EnhanceOptions>) => void;
}

const ENHANCE_ITEMS: { key: keyof EnhanceOptions; title: string; desc: string }[] = [
  { key: "title", title: "优化标题", desc: "让标题更吸引点击" },
  { key: "summary", title: "生成摘要", desc: "自动提炼公众号摘要" },
  { key: "colloquialize", title: "口语化改写", desc: "小红书风格更亲切" },
];

/** AI 设置抽屉:LLM 配置(OpenAI 兼容)+ 增强开关。apiKey 仅存本地。 */
export function SettingsDrawer({ open, onOpenChange, llm, enhance, ready, onLlm, onEnhance }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="drawer" aria-describedby={undefined}>
          <div className="drawer-header">
            <Dialog.Title className="drawer-title">
              <Sparkles size={18} aria-hidden style={{ verticalAlign: "-3px", marginRight: 6 }} />
              AI 风格优化
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="btn-icon" aria-label="关闭">
                <X size={18} aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <div className="drawer-body">
            <label className="field">
              <span className="field-label">API 基址（到 /v1）</span>
              <input
                className="field-input"
                value={llm.baseUrl}
                placeholder="https://api.deepseek.com/v1"
                onChange={(e) => onLlm({ baseUrl: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">
                <KeyRound size={12} aria-hidden style={{ verticalAlign: "-2px", marginRight: 4 }} />
                API Key（仅存本地，不入库）
              </span>
              <input
                className="field-input"
                type="password"
                value={llm.apiKey}
                placeholder="sk-..."
                autoComplete="off"
                onChange={(e) => onLlm({ apiKey: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">模型</span>
              <input
                className="field-input"
                value={llm.model}
                placeholder="deepseek-chat"
                onChange={(e) => onLlm({ model: e.target.value })}
              />
            </label>

            <div className="tag tag-neutral" style={{ alignSelf: "flex-start" }}>
              {ready ? "已配置，可启用下列增强" : "未配置 Key，规则式适配仍完整可用"}
            </div>

            <div>
              {ENHANCE_ITEMS.map((item) => (
                <div className="switch-row" key={item.key} data-disabled={ready ? undefined : ""}>
                  <span className="switch-row-label">
                    <span className="switch-row-title">{item.title}</span>
                    <span className="switch-row-desc">{item.desc}</span>
                  </span>
                  <Switch.Root
                    className="switch"
                    disabled={!ready}
                    checked={!!enhance[item.key]}
                    onCheckedChange={(v) => onEnhance({ [item.key]: v })}
                    aria-label={item.title}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </div>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
