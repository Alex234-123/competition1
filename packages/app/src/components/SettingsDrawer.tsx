import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import { X, Sparkles, KeyRound, Image, Send } from "lucide-react";
import type { EnhanceOptions } from "@mpp/core";
import type { PlatformAutomationModes, WechatPublishMode } from "../state/store.js";
import type { AutomationPublishMode } from "../bridge/types.js";

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
  serverUrl: string;
  runnerUrl: string;
  wechatPublishMode: WechatPublishMode;
  automationModes: PlatformAutomationModes;
  onLlm: (patch: Partial<LlmSettings>) => void;
  onEnhance: (patch: Partial<EnhanceOptions>) => void;
  onServerUrl: (url: string) => void;
  onRunnerUrl: (url: string) => void;
  onWechatPublishMode: (mode: WechatPublishMode) => void;
  onAutomationMode: (platformId: string, mode: AutomationPublishMode) => void;
}

const ENHANCE_ITEMS: { key: keyof EnhanceOptions; title: string; desc: string }[] = [
  { key: "title", title: "优化标题", desc: "让标题更吸引点击" },
  { key: "summary", title: "生成摘要", desc: "自动提炼公众号摘要" },
  { key: "colloquialize", title: "口语化改写", desc: "小红书风格更亲切" },
  { key: "rewrite", title: "全文润色", desc: "优化 HTML 平台正文表达" },
];

/** AI 设置抽屉:LLM 配置(OpenAI 兼容)+ 增强开关 + 图床配置。apiKey 仅存本地。 */
export function SettingsDrawer({
  open,
  onOpenChange,
  llm,
  enhance,
  ready,
  serverUrl,
  runnerUrl,
  wechatPublishMode,
  automationModes,
  onLlm,
  onEnhance,
  onServerUrl,
  onRunnerUrl,
  onWechatPublishMode,
  onAutomationMode,
}: Props) {
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
              <small className="field-hint">
                服务地址，如 https://api.openai.com/v1 或 https://api.deepseek.com/v1
              </small>
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
              <small className="field-hint">
                在模型平台控制台创建，如 platform.openai.com/api-keys
              </small>
            </label>
            <label className="field">
              <span className="field-label">模型</span>
              <input
                className="field-input"
                value={llm.model}
                placeholder="deepseek-chat"
                onChange={(e) => onLlm({ model: e.target.value })}
              />
              <small className="field-hint">如 gpt-4o / deepseek-chat / kimi-latest / qwen-turbo</small>
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

            {/* 图床配置 */}
            <div style={{ borderTop: "1px solid var(--border)", margin: 0 }} />
            <h3 style={{ fontSize: "var(--fs-sm)", fontWeight: 650, margin: 0, display: "flex", alignItems: "center", gap: "var(--sp-1)" }}>
              <Image size={14} aria-hidden />
              图床配置
            </h3>
            <label className="field">
              <span className="field-label">上传服务地址</span>
              <input
                className="field-input"
                value={serverUrl}
                placeholder="http://127.0.0.1:8787"
                onChange={(e) => onServerUrl(e.target.value)}
              />
              <small className="field-hint">
                图片上传服务地址，本地开发默认 http://127.0.0.1:8787
              </small>
            </label>

            <div style={{ borderTop: "1px solid var(--border)", margin: 0 }} />
            <h3 style={{ fontSize: "var(--fs-sm)", fontWeight: 650, margin: 0, display: "flex", alignItems: "center", gap: "var(--sp-1)" }}>
              <Send size={14} aria-hidden />
              公众号发布
            </h3>
            <label className="field">
              <span className="field-label">发布方式</span>
              <select
                className="field-input"
                value={wechatPublishMode}
                onChange={(e) => onWechatPublishMode(e.target.value as WechatPublishMode)}
              >
                <option value="mock">模拟发布</option>
                <option value="draft">创建公众号草稿</option>
                <option value="publish">提交公众号发布</option>
              </select>
              <small className="field-hint">
                真实发布需要先启动本地 server，并在 server 的 .env 中配置 AppID/AppSecret。
              </small>
            </label>

            <div style={{ borderTop: "1px solid var(--border)", margin: 0 }} />
            <h3 style={{ fontSize: "var(--fs-sm)", fontWeight: 650, margin: 0, display: "flex", alignItems: "center", gap: "var(--sp-1)" }}>
              <Send size={14} aria-hidden />
              Playwright 真实分发
            </h3>
            <label className="field">
              <span className="field-label">Runner 地址</span>
              <input
                className="field-input"
                value={runnerUrl}
                placeholder="http://127.0.0.1:8790"
                onChange={(e) => onRunnerUrl(e.target.value)}
              />
              <small className="field-hint">
                启动 `npm run runner` 后，知乎/B站/小红书可用本机浏览器登录态执行真实网页发布。
              </small>
            </label>
            {[
              ["zhihu", "知乎"],
              ["bilibili", "B站"],
              ["xiaohongshu", "小红书"],
              ["wechat", "公众号网页兜底"],
            ].map(([id, name]) => (
              <label className="field" key={id}>
                <span className="field-label">{name}</span>
                <select
                  className="field-input"
                  value={automationModes[id] ?? "mock"}
                  onChange={(e) => onAutomationMode(id, e.target.value as AutomationPublishMode)}
                >
                  <option value="mock">模拟发布</option>
                  <option value="assist">辅助复制/注入</option>
                  <option value="draft">自动填写并保存草稿</option>
                  <option value="full-auto">全自动点击发布</option>
                </select>
              </label>
            ))}
            <small className="field-hint">
              全自动发布会点击目标平台最终发布按钮；遇到登录、验证码、短信、人机或风险验证会停止并要求人工处理。
            </small>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
