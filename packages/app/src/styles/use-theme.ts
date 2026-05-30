/**
 * 主题管理:light / dark / system 三态。
 *
 * - system:移除 <html data-theme>,交给 CSS 的 prefers-color-scheme 兜底。
 * - light/dark:写 <html data-theme> 覆盖系统。
 * 偏好持久化到 localStorage(同步读取,避免首屏闪烁;扩展环境也可用 localStorage)。
 */
import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "mpp.theme";

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* localStorage 不可用时回退 system */
  }
  return "system";
}

/** 应用主题到 <html>:system 移除属性,其余写 data-theme。在模块加载与切换时调用。 */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

/** 计算当前生效的明暗(system 时读媒体查询),用于图标显示。 */
function resolveEffective(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readStored);
  const [effective, setEffective] = useState<"light" | "dark">(() => resolveEffective(readStored()));

  // 切换时落 DOM + 持久化。
  useEffect(() => {
    applyTheme(mode);
    setEffective(resolveEffective(mode));
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* 忽略写入失败 */
    }
  }, [mode]);

  // system 模式下跟随系统变化实时更新生效值。
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => setEffective(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  // 在 light → dark → system 间循环。
  const cycle = useCallback(() => {
    setMode((m) => (m === "light" ? "dark" : m === "dark" ? "system" : "light"));
  }, []);

  return { mode, effective, setMode, cycle };
}
