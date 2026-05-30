/**
 * 适配器注册表 —— 加平台零改核心的关键。
 *
 * 核心逻辑(同步引擎、UI、demo)只通过 getAdapter/listAdapters 访问平台,
 * 绝无 switch(platform)。新平台 = 实现 adapter + 在此 register 一次。
 */
import type { PlatformAdapter } from "./types.js";
import { WechatAdapter } from "./wechat/index.js";
import { ZhihuAdapter } from "./zhihu/index.js";
import { BilibiliAdapter } from "./bilibili/index.js";
import { XiaohongshuAdapter } from "./xiaohongshu/index.js";

const REGISTRY = new Map<string, PlatformAdapter>();

export function registerAdapter(adapter: PlatformAdapter): void {
  REGISTRY.set(adapter.id, adapter);
}

export function getAdapter(id: string): PlatformAdapter | undefined {
  return REGISTRY.get(id);
}

export function listAdapters(): readonly PlatformAdapter[] {
  return [...REGISTRY.values()];
}

export function listPlatformIds(): readonly string[] {
  return [...REGISTRY.keys()];
}

// 内置四平台注册(加平台只需在此追加一行)。
registerAdapter(new WechatAdapter());
registerAdapter(new ZhihuAdapter());
registerAdapter(new BilibiliAdapter());
registerAdapter(new XiaohongshuAdapter());
