import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { MockBridge } from "./bridge/mock-bridge.js";
import { ChromeBridge } from "./bridge/chrome-bridge.js";
import type { PlatformBridge } from "./bridge/types.js";
import { useStore } from "./state/store.js";
import { applyTheme } from "./styles/use-theme.js";
import "./styles/index.css";

// 首屏前应用持久化主题(避免亮暗闪烁)。system 模式由 CSS 媒体查询兜底。
try {
  const saved = localStorage.getItem("mpp.theme");
  if (saved === "light" || saved === "dark") applyTheme(saved);
} catch {
  /* localStorage 不可用时走 system 默认 */
}

// 运行时检测环境,选择 bridge:扩展环境(chrome.runtime.id 存在)用 ChromeBridge,否则 MockBridge。
function detectBridge(): PlatformBridge {
  const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.id;
  return isExtension ? new ChromeBridge() : new MockBridge();
}

const bridge = detectBridge();
useStore.getState().setBridge(bridge);

// 从本地存储恢复 LLM / serverUrl / enhance 设置(仅存本地)。
void bridge.getSetting("mpp.llm").then((raw) => {
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Partial<{ baseUrl: string; apiKey: string; model: string }>;
    useStore.setState((s) => ({ llm: { ...s.llm, ...saved } }));
  } catch {
    /* 忽略损坏的设置 */
  }
});

void bridge.getSetting("mpp.serverUrl").then((raw) => {
  if (raw) useStore.setState({ serverUrl: raw });
});

void bridge.getSetting("mpp.enhance").then((raw) => {
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Partial<{ title?: boolean; summary?: boolean; colloquialize?: boolean; rewrite?: boolean }>;
    useStore.setState((s) => ({ enhance: { ...s.enhance, ...saved } }));
  } catch {
    /* 忽略损坏的设置 */
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
