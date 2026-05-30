import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { MockBridge } from "./bridge/mock-bridge.js";
import { ChromeBridge } from "./bridge/chrome-bridge.js";
import type { PlatformBridge } from "./bridge/types.js";
import { useStore } from "./state/store.js";
import "./styles.css";

// 运行时检测环境,选择 bridge:扩展环境(chrome.runtime.id 存在)用 ChromeBridge,否则 MockBridge。
function detectBridge(): PlatformBridge {
  const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.id;
  return isExtension ? new ChromeBridge() : new MockBridge();
}

const bridge = detectBridge();
useStore.getState().setBridge(bridge);

// 从本地存储恢复 LLM 设置(apiKey 仅存本地)。
void bridge.getSetting("mpp.llm").then((raw) => {
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Partial<{ baseUrl: string; apiKey: string; model: string }>;
    useStore.setState((s) => ({ llm: { ...s.llm, ...saved } }));
  } catch {
    /* 忽略损坏的设置 */
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
